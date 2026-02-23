# Procedimentos de Backup: In Memoriam Brasil
fd
Este documento define as políticas, ferramentas e procedimentos detalhados para realizar o backup completo do sistema **In Memoriam Brasil**. Um plano de backup eficiente é vital para garantir a disponibilidade, a integridade dos dados dos usuários e a rápida recuperação em caso de falhas, exclusões acidentais ou ataques.

O escopo de backup desta aplicação envolve três pilares principais:
1. **Código-fonte e Configurações da Aplicação**
2. **Banco de Dados (MongoDB)**
3. **Arquivos Estáticos e Mídias (Cloudflare R2)**

---

## 1. Backup da Aplicação (App e Configurações)

A maior parte do código-fonte é versionada utilizando **Git**. No entanto, alguns arquivos vitais são ignorados por questões de segurança (como os definidos no arquivo `.gitignore`, ex: `.env`), e por isso precisam ser copiados de forma complementar no servidor de produção.

### 1.1 Código-fonte
O repositório oficial deve estar sempre atualizado e sincronizado. Certifique-se de que não haja código não comitado no ambiente de produção.
- **Ferramenta:** `git`
- **Procedimento:** Garanta que a base de código primária esteja espelhada de forma segura (ex: GitHub, GitLab, Bitbucket). Em caso de falha do servidor, o código é recriado via `git clone`.

### 1.2 Arquivos de Configuração (.env)
O arquivo `.env` contém dados críticos (como senhas do MongoDB, chaves secretas do Cloudflare R2, tokens de API e segredos de sessão). A perda deste arquivo exige a recriação manual de todas as integrações.
- **Procedimento sugerido via SCP/SFTP:**
  A partir da sua máquina local ou de um servidor de backup seguro, faça uma cópia:
  ```bash
  scp ubuntu@<IP_DO_SERVIDOR>:/caminho/para/inmemoriambrasil/.env /caminho/local/backup/inmemoriam_env_backup_$(date +%F)
  ```
- **Frequência:** Sempre que houver alguma alteração de chaves, credenciais ou variáveis no servidor de produção.

---

## 2. Backup do Banco de Dados (MongoDB)

O banco de dados (configurado via `MONGO_URI` no `.env`) armazena todas as informações dos memoriais, usuários, sessões e tributos. O projeto suporta tanto instâncias nativas (como um VPS ou contêiner local) quanto o MongoDB Atlas (Nuvem).

A ferramenta padrão para o backup lógico é o utilitário oficial `mongodump`.

### 2.1 Requisitos
É necessário possuir o **MongoDB Database Tools** (que inclui o `mongodump` e `mongorestore`) instalado na máquina de onde o backup será orquestrado.

### 2.2 Backup do MongoDB Atlas (Produção em Nuvem)
Se o banco oficial for o MongoDB Atlas (ex: conexão `mongodb+srv://...`), utilize o comando abaixo substituindo as credenciais pelas informações contidas no `.env`:
```bash
# Crie a pasta de destino
mkdir -p /backups/db

# Execute o dump usando a connection string
mongodump --uri="mongodb+srv://usuario:senha@cluster000.xxxx.mongodb.net/inmemoriambrasilBD" --out=/backups/db/inmemoriam_db_$(date +%F)
```

### 2.3 Backup via Servidor com Túnel SSH (VPS/Docker)
Caso o banco esteja isolado numa rede interna (conforme os comandos SSH no `.env`), o procedimento envolve a abertura de um túnel seguro para acessar a porta 27017 localmente:

```bash
# 1. Abrir o túnel SSH em background (-f)
ssh -f -L 27017:172.18.0.8:27017 ubuntu@<IP_DO_SERVIDOR_VPS> -N

# 2. Executar o backup via localhost
mongodump --uri="mongodb://localhost:27017/inmemoriambrasilBD" --out=/backups/db/inmemoriam_db_$(date +%F)

# 3. Encerrar o processo do túnel SSH após a conclusão
pkill -f "ssh -f -L 27017"
```

### 2.4 Compactação e Proteção
Comprima o diretório de dados BSON gerado pelo `mongodump` em um arquivo do tipo `.tar.gz` para diminuir o tamanho ocupado em disco:
```bash
tar -czvf inmemoriam_db_$(date +%F).tar.gz -C /backups/db inmemoriam_db_$(date +%F)
```

---

## 3. Backup de Arquivos (Cloudflare R2)

O Cloudflare R2 armazena todas as fotos, mídias e anexos (upload via multer / s3-client) vinculados aos memoriais. O R2 possui uma API compatível com o Amazon S3, permitindo o uso de ferramentas consagradas.

### 3.1 Utilizando AWS CLI (Opção 1)
O `aws-cli` é uma das ferramentas mais populares para gerenciar diretórios S3 e R2.

1. Instale o AWS CLI na máquina que realizará os backups (`sudo apt install awscli`).
2. Configure credenciais (informe a `R2_ACCESS_KEY` e `R2_SECRET_KEY` do arquivo `.env`):
   ```bash
   aws configure
   ```
3. Execute o comando de sincronização informando o Endpoint do Cloudflare account (sempre disponível no painel ou `.env`):
   ```bash
   aws s3 sync s3://<R2_BUCKET> /backups/r2_files/ \
     --endpoint-url https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com
   ```
   *Nota: O recurso `sync` faz o download apenas dos arquivos que foram alterados ou adicionados desde a última execução, sendo ótimo para backups diários.*

### 3.2 Utilizando o Rclone (Opção 2 - Recomendada Profissionalmente)
O **Rclone** é extremamente robusto e lida melhor com grandes volumes de transferências paralelizáveis.

1. Instale o rclone: `curl https://rclone.org/install.sh | sudo bash`
2. Configure o provedor como AWS/S3 ou R2 (`rclone config`).
3. Com o nome remoto configurado (chamemos de `cloudflare_r2`), rode a sincronização:
   ```bash
   rclone sync cloudflare_r2:<R2_BUCKET> /backups/r2_files/ --progress --transfers 16
   ```

---

## 4. Retenção e Automação via Cron Jobs

O plano de backup só é seguro quando automatizado e monitorado. Recomendações:

1. **Frequência Requerida:**
   - **Banco de Dados (MongoDB):** Backup *Diário* executado durante a madrugada (horário de menor uso, ex: 03:00 da manhã).
   - **Cloudflare R2:** Sincronização Incremental *Diária*.
   - **Aplicação/Configurações:** Imediato após atualizações de versão ou mudanças nas variáveis de ambiente.

2. **Rotina com Shell Script (Linux OS):**
   Crie um arquivo `/usr/local/bin/backup_inmemoriam.sh` englobando os comandos de DB, AWS Sync/Rclone, compressão final em `tar.gz` e envio de notificação em caso de sucesso ou erro. Aplique permissão de execução (`chmod +x`).

3. **Exemplo de Agendamento (Crontab):**
   Execute `crontab -e` no servidor responsável pelos backups e adicione:
   ```cron
   # Executar rotina completa de backup diariamente às 03:00 AMS
   0 3 * * * /usr/local/bin/backup_inmemoriam.sh >> /var/log/backup_inmemoriam.log 2>&1
   ```

4. **Política de Retenção Sugerida:**
   - Mantenha os backups diários locais dos últimos **7 a 14 dias**.
   - Mantenha versões semanais antigas para garantir estabilidade contínua.
   - Utilize comandos para auto-limpeza (ex: apagar backups gerados há mais de 30 dias `find /backups/db/ -type f -name "*.tar.gz" -mtime +30 -exec rm {} \;`).

---

## 5. Procedimentos de Restauração (Restore)

Para fins de Disaster Recovery, é essencial testar temporariamente a injeção do backup em um banco ou ambiente secundário.

### 5.1 Restaurando o Banco de Dados (`mongorestore`)
Para subir um backup de uma data específica para a produção (ou ambiente de staging/teste):
```bash
mongorestore --uri="mongodb+srv://usuario:senha@cluster000.xxxx.mongodb.net/inmemoriambrasilBD" --drop /backups/db/inmemoriam_db_2026-02-21/
```
> **Aviso:** A opção `--drop` excluirá as coleções atuais existentes no destino antes de restaurar os dados do backup. Use com extremo cuidado.

### 5.2 Restaurando Mídias (R2 / S3)
Para devolver os arquivos do armazenamento local para a nuvem da Cloudflare, basta inverter a origem e o destino no parâmetro `aws s3 sync`:
```bash
aws s3 sync /backups/r2_files/ s3://<R2_BUCKET> \
  --endpoint-url https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com
```
