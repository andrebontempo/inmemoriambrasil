const LocalStrategy = require("passport-local").Strategy
const GoogleStrategy = require("passport-google-oauth20").Strategy
const bcrypt = require("bcrypt")
const User = require("../app/models/User")

module.exports = function (passport) {
    // =============================================
    // SERIALIZAÇÃO / DESERIALIZAÇÃO
    // =============================================
    passport.serializeUser((user, done) => {
        done(null, user._id)
    })

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id).lean()
            done(null, user)
        } catch (err) {
            done(err, null)
        }
    })

    // =============================================
    // ESTRATÉGIA LOCAL (email + senha)
    // =============================================
    passport.use(
        new LocalStrategy(
            {
                usernameField: "email",
                passwordField: "password",
            },
            async (email, password, done) => {
                try {
                    email = email.trim().toLowerCase()

                    const user = await User.findOne({ email })

                    if (!user) {
                        return done(null, false, { message: "E-mail ou senha inválidos." })
                    }

                    // Usuário que se cadastrou via Google (sem senha local)
                    if (!user.password) {
                        return done(null, false, {
                            message: "Esta conta usa login via Google. Clique em 'Entrar com Google'.",
                        })
                    }

                    const isMatch = await bcrypt.compare(password.trim(), user.password)

                    if (!isMatch) {
                        return done(null, false, { message: "E-mail ou senha inválidos." })
                    }

                    return done(null, user)
                } catch (err) {
                    return done(err)
                }
            }
        )
    )

    // =============================================
    // ESTRATÉGIA GOOGLE OAuth 2.0
    // =============================================
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        const callbackURL =
            (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "") +
            "/auth/google/callback"

        passport.use(
            new GoogleStrategy(
                {
                    clientID: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    callbackURL,
                },
                async (accessToken, refreshToken, profile, done) => {
                    try {
                        const googleEmail = (
                            profile.emails && profile.emails[0]
                                ? profile.emails[0].value
                                : ""
                        )
                            .trim()
                            .toLowerCase()

                        // 1) Já tem conta com este googleId?
                        let user = await User.findOne({ googleId: profile.id })
                        if (user) {
                            return done(null, user)
                        }

                        // 2) Já tem conta com este email (cadastro local)?
                        user = await User.findOne({ email: googleEmail })
                        if (user) {
                            // Vincula a conta Google à conta local existente
                            user.googleId = profile.id
                            if (!user.avatar || user.avatar.includes("user_default")) {
                                user.avatar =
                                    profile.photos && profile.photos[0]
                                        ? profile.photos[0].value
                                        : user.avatar
                            }
                            await user.save()
                            return done(null, user)
                        }

                        // 3) Criar conta nova
                        const newUser = new User({
                            googleId: profile.id,
                            firstName: profile.name?.givenName || profile.displayName || "Usuário",
                            lastName: profile.name?.familyName || "",
                            email: googleEmail,
                            authProvider: "google",
                            avatar:
                                profile.photos && profile.photos[0]
                                    ? profile.photos[0].value
                                    : "/css/main/files/user_default.png",
                        })

                        await newUser.save()
                        return done(null, newUser)
                    } catch (err) {
                        return done(err)
                    }
                }
            )
        )
    }
}
