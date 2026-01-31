/**
 * In Memoriam Brasil - Common Utils
 */

document.addEventListener("DOMContentLoaded", function () {
  handleFlashMessages();
});

/**
 * Handles the auto-dismissal of flash messages (alerts)
 */
function handleFlashMessages() {
  const alerts = document.querySelectorAll(".alert");

  if (alerts.length > 0) {
    setTimeout(() => {
      alerts.forEach((alert) => {
        alert.classList.remove("show"); // remove Bootstrap class
        alert.classList.add("fade-out-up"); // apply custom animation
        setTimeout(() => alert.remove(), 500); // remove from DOM
      });
    }, 5000); // Increased visibility time slightly for better UX (was 2000)
  }
}
