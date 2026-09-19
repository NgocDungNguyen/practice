# A3 setup guide - Nguyen Ngoc Dung (s3978535)

Blocks marked `powershell` run on your Windows PC. Blocks marked `bash` run on the EC2 instance (Amazon Linux, as root, same as the guide).
Anything in `<ANGLE_BRACKETS>` is a value you fill in. Anything in CAPITALS at the top of a block is a variable you set once.

## 0. Your profile and fixed values

| Item                                     | Value                                                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Full name (README, index.jsp, reports)   | Nguyen Ngoc Dung                                                                                            |
| Student ID                               | s3978535                                                                                                    |
| Email                                    | s3978535@rmit.edu.vn                                                                                        |
| Repo (SSH URL, use this)                 | `git@github.com:rmit-vietnam-computing-technologies/2026b-cosc2767-a3-hn-ngocdungnguyen-s3978535.git`     |
| Repo (HTTPS URL, fallback only)          | `https://github.com/rmit-vietnam-computing-technologies/2026b-cosc2767-a3-hn-ngocdungnguyen-s3978535.git` |
| Git author on your PC today              | `NgocDungNguyen` / `s3978535@rmit.edu.vn` (already in `git config --global`)                          |
| EC2 login user                           | `ec2-user`, then `sudo su -` to become root                                                             |
| Default password for anything you create | `abc123`                                                                                                  |

State of your PC when this was written (checked, nothing was changed):

- `~/.ssh` has only `known_hosts`. No key pair exists, so GitHub cannot recognise this PC yet.
- The `ssh-agent` service is Disabled. Do not rely on it; section 2 uses a config file instead.
- The GitHub CLI (`gh`) is not installed. You do not need it.
- No `.pem` file was found in your home, Downloads or `.ssh` folders. You will need the AWS key from the Learner Lab (section 3).
- PowerShell is 5.1, which has two quirks that are handled below: an empty ssh passphrase and file encoding.

Read this before starting: **GitHub does not accept your account password (or `abc123`) for git over HTTPS**, and it has not since 2021. Git only works through an SSH key or a personal access token. Everything in this guide uses SSH because it never expires and there is nothing to paste into a screenshot by accident.

---

## 1. Understand the three separate keys (this is what cost you time in A1)

| From    | To     | Credential      | Where it lives                                                           |
| ------- | ------ | --------------- | ------------------------------------------------------------------------ |
| Your PC | EC2    | AWS`.pem` key | Downloaded once from AWS                                                 |
| Your PC | GitHub | key pair#1      | `~/.ssh/id_rsa_a3` on the PC (optional, only if you use git on the PC) |
| EC2     | GitHub | key pair#2      | `/root/.ssh/id_rsa` on the EC2                                         |

Each key pair's **public** half (`.pub`) is added to GitHub under Settings > SSH and GPG keys. The **private** half never leaves the machine that made it. GitHub keys belong to your account, so one account can hold many keys at once.

The most likely reason for A1 pain: generating the key on one machine but running `git` as a different user (for example key made as `ec2-user`, `git clone` run as root). Keys are per user. Stay root on the EC2 for the whole assignment.

---

## 2. Windows PowerShell: prepare your PC (do once, 10 minutes)

### 2.1 Put the AWS key somewhere safe and fix its permissions

Windows refuses to use a `.pem` that other users can read (`UNPROTECTED PRIVATE KEY FILE`). The guide's fix uses `icacls`.

```powershell
$KEY = "$HOME\.ssh\devops_project_key.pem" 
Move-Item "$HOME\Downloads\<YOUR_PEM_FILE>.pem" $KEY
icacls $KEY /reset
icacls $KEY /inheritance:r
icacls $KEY /grant:r "$($env:USERNAME):(R)"
icacls $KEY                                     # should list only your user with (R)
```

### 2.2 Confirm your Git identity

```powershell
git config --global user.name
git config --global user.email
```

You should see `NgocDungNguyen` and `s3978535@rmit.edu.vn`. Leave them. The EC2 gets its own identity in section 5.

### 2.3 Optional: a GitHub key for the PC

Only needed if you want to `git clone` or push from Windows. The assignment itself can be done entirely on the EC2. If you skip this, skip 2.3 and 2.4.

```powershell
ssh-keygen -t rsa -b 4096 -C "s3978535@rmit.edu.vn" -f "$HOME\.ssh\id_rsa_a3" -N '""'
```

The odd `'""'` is the PowerShell 5.1 way to say "no passphrase". Without it the command may prompt or fail.

Tell ssh which key to use for GitHub. Use `-Encoding ascii`: PowerShell 5.1 otherwise writes a BOM/UTF-16 file and ssh fails with `Bad configuration option`.

```powershell
@"
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_a3
  IdentitiesOnly yes
"@ | Set-Content -Encoding ascii "$HOME\.ssh\config"
```

(There is no `config` file today, so this creates it. If you add more hosts later, use `Add-Content`, not `Set-Content`.)

### 2.4 Add the PC key to GitHub, then test

```powershell
Get-Content "$HOME\.ssh\id_rsa_a3.pub" | Set-Clipboard
```

Browser: https://github.com/settings/ssh/new, Title `a3-laptop`, Key type `Authentication Key`, paste, Add SSH key.

```powershell
ssh -T git@github.com
```

First time it asks `Are you sure you want to continue connecting`. Type `yes`. Expected reply:

```
Hi <your-github-username>! You've successfully authenticated, but GitHub does not provide shell access.
```

That reply also tells you your exact GitHub username. Write it down: only the HTTPS/token fallback needs it.

---

## 3. AWS Learner Lab and launching the EC2

A1 started with a clean-up. Expect the same here, but read the A3 spec for the exact list and names.

1. Start the Learner Lab. Wait for the AWS dot to turn green, then open the console.
2. Clean up before launching (EC2 > Instances, AMIs, Snapshots): terminate instances, deregister AMIs, delete snapshots. Take the "no resources" screenshots the spec asks for.
3. Launch the instance:
   - Name: whatever A3 specifies (A1 used `DevOps-Midterm-Exam-2026B`).
   - Image: Amazon Linux (the guide labs use it, login user `ec2-user`).
   - Size: 2 GB RAM or more if Jenkins may be needed later; `t3.small` is a safe default.
   - Key pair: create or reuse; download the `.pem` and use it in section 2.1.
   - Security group inbound rules, add them now so you do not forget: SSH 22 from your IP, Custom TCP 8080, and Custom TCP 8086. Add the assigned 9xxx-style port only if A3 asks for one.
4. Copy the **Public IPv4 DNS** of the instance. Learner Lab changes the public address every time the lab stops and restarts, so recopy it each session.

---

## 4. Windows PowerShell: connect to the EC2

```powershell
$KEY  = "$HOME\.ssh\devops_project_key.pem"
$HOST_ = "ec2-<A-B-C-D>.compute-1.amazonaws.com"     # paste the Public IPv4 DNS
ssh -i $KEY ec2-user@$HOST_
```

First connection asks to trust the host: type `yes`.

If the address changed and you reuse an old entry, ssh shouts `REMOTE HOST IDENTIFICATION HAS CHANGED`. Fix:

```powershell
ssh-keygen -R $HOST_
```

Copy files between PC and EC2 (only when you really need to, for example a screenshot or a prepared file):

```powershell
scp -i $KEY .\file.txt ec2-user@${HOST_}:~/
```

### 4.1 Become root and set the hostname (do this first, before any screenshot)

A1 gave zero if the prompt did not show the required hostname. Use the exact text the A3 spec gives. Placeholder below follows the A1 pattern.

```bash
sudo su -
HN=s3978535-final-exam-2026b          # REPLACE with the exact hostname A3 requires
hostnamectl set-hostname $HN
reboot
```

The SSH session drops. Wait about a minute, then reconnect from PowerShell and run `sudo su -` again. The prompt must read like:

```
[root@s3978535-final-exam-2026b ~]#
```

If it still shows `ip-172-...` after the reboot, the name did not persist. Run:

```bash
echo "preserve_hostname: true" >> /etc/cloud/cloud.cfg
hostnamectl set-hostname s3978535-final-exam-2026b
reboot
```

Tip so a dropped connection does not lose the session: add `-o ServerAliveInterval=60` to the ssh command.

---

## 5. EC2 (bash, as root): Git, key, clone

```bash
dnf install -y git
git config --global user.name  "Nguyen Ngoc Dung"
git config --global user.email "s3978535@rmit.edu.vn"
git config --global init.defaultBranch main
git config --global core.autocrlf input
git config --global --list
```

### 5.1 Make the EC2's own GitHub key

```bash
ssh-keygen -t rsa -b 4096 -C "s3978535@rmit.edu.vn" -N "" -f ~/.ssh/id_rsa
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
cat ~/.ssh/id_rsa.pub
```

This output is screenshot 1a-style evidence in A1 (terminal showing the key pair generated). Show the `ssh-keygen` command and its result, not the private key.

Copy the public key to GitHub one of two ways:

- Select the `cat` output in the terminal, copy, and paste it at https://github.com/settings/ssh/new (Title `a3-ec2`).
- Or from a **second PowerShell window** (no manual selecting):
  ```powershell
  ssh -i $KEY ec2-user@$HOST_ "sudo cat /root/.ssh/id_rsa.pub" | Set-Clipboard
  ```

### 5.2 Test, then clone

```bash
ssh -T git@github.com
```

Type `yes` at the first prompt. You must see `Hi <username>! You've successfully authenticated...`.

```bash
cd ~
git clone git@github.com:rmit-vietnam-computing-technologies/2026b-cosc2767-a3-hn-ngocdungnguyen-s3978535.git
cd 2026b-cosc2767-a3-hn-ngocdungnguyen-s3978535
ls -la
cat .gitignore
cat README.md
git remote -v            # must show git@github.com:..., not https://...
```

### 5.3 The placeholder README and the .gitignore

- The README is a placeholder. When A3 gives the real content, replace it (`nano README.md`), filling every bracketed placeholder with: Nguyen Ngoc Dung, s3978535, your GitHub username, plus the course/assessment wording A3 gives.
- Open `.gitignore` and look for `*.war`, `*.jar` and `target/`. GitHub's Java template ignores `*.war`/`*.jar` and its Maven template ignores `target/`. If A3 requires committing a WAR (the sample did), `git add` will silently skip it. Check with:
  ```bash
  git check-ignore -v question-1/hello/target/hello.war
  git add -f question-2/hello.war         # force-add only if the spec wants it committed
  ```

  Do not edit `.gitignore` unless the spec says so.

### 5.4 First commit on main, then the develop branch

Use the commit messages A3 specifies. A1's were the following, so expect similar:

```bash
nano README.md
git add README.md
git commit -m "Edit the README file"
git push origin main

git checkout -b develop
mkdir question-1
cp README.md question-1/
git add .
git commit -m "Add question-1 README"
git push -u origin develop
```

Git does not store empty folders. A `question-2` directory with nothing in it vanishes from GitHub, so always put a file in it before committing.

Check who you committed as: `git log -1 --format='%an <%ae>'` must print `Nguyen Ngoc Dung <s3978535@rmit.edu.vn>`.

---

## 6. Tools on the EC2 (as root), based on the guide

### 6.1 Java and Maven (Week 4)

```bash
dnf install -y java-21-amazon-corretto-devel
java -version

cd /opt
wget https://archive.apache.org/dist/maven/maven-3/3.9.11/binaries/apache-maven-3.9.11-bin.tar.gz
tar -xvzf apache-maven-3.9.11-bin.tar.gz
mv apache-maven-3.9.11 maven

cat >> ~/.bash_profile <<'EOF'
M2_HOME=/opt/maven
M2=$M2_HOME/bin
JAVA_HOME=/usr/lib/jvm/java-21-amazon-corretto
PATH=$PATH:$HOME/bin:$JAVA_HOME/bin:$M2
export M2_HOME M2 JAVA_HOME PATH
EOF
source ~/.bash_profile
mvn -version
```

If `ls /usr/lib/jvm` shows a different folder name, use that for `JAVA_HOME`. (`archive.apache.org` is used because `dlcdn` only keeps the newest version and the link breaks.)

### 6.2 Tomcat (Week 4), only if the spec asks

```bash
cd /opt
wget https://archive.apache.org/dist/tomcat/tomcat-9/v9.0.97/bin/apache-tomcat-9.0.97.tar.gz
tar -xvzf apache-tomcat-9.0.97.tar.gz
mv apache-tomcat-9.0.97 tomcat
ln -s /opt/tomcat/bin/startup.sh  /usr/local/bin/tomcatup
ln -s /opt/tomcat/bin/shutdown.sh /usr/local/bin/tomcatdown
tomcatup
```

Then open `http://<EC2-PUBLIC-IP>:8080` (security group must allow 8080).

### 6.3 Docker (Week 6)

```bash
dnf install -y docker
systemctl enable --now docker
usermod -aG docker ec2-user
docker version
systemctl status docker --no-pager
```

That output is what a "Docker version and running service" screenshot needs.

---

## 7. Question 1 and Question 2 (from the sample)

### Q1: Maven web app (tested on your PC with Maven 3.9.11)

```bash
cd ~/2026b-cosc2767-a3-hn-ngocdungnguyen-s3978535
git checkout develop
mkdir -p question-1 && cd question-1
mvn archetype:generate -DgroupId=vn.edu.rmit -DartifactId=hello \
  -DarchetypeArtifactId=maven-archetype-webapp -DinteractiveMode=false
cd hello
nano src/main/webapp/index.jsp
```

Set `index.jsp` to (follow the exact wording of A3, this is the sample's pattern):

```html
<html>
<body>
<h2>[2026B] I am Nguyen Ngoc Dung - s3978535 from the DevOps final exam</h2>
</body>
</html>
```

```bash
mvn package
ls -l target/hello.war
cd ~/2026b-cosc2767-a3-hn-ngocdungnguyen-s3978535
git add question-1
git commit -m "Set up Maven web application"
git push
```

### Q2: Docker image and Docker Hub

```bash
cd ~/2026b-cosc2767-a3-hn-ngocdungnguyen-s3978535
mkdir -p question-2 && cd question-2
cp ../question-1/hello/target/hello.war .
cat > Dockerfile <<'EOF'
FROM tomcat:latest
RUN cp -R /usr/local/tomcat/webapps.dist/* /usr/local/tomcat/webapps
COPY ./*.war /usr/local/tomcat/webapps
EOF
docker build -t <DOCKERHUB_USER>/hello:latest .
docker run -d --name hello-container -p 8086:8080 <DOCKERHUB_USER>/hello:latest
docker ps
```

Open `http://<EC2-PUBLIC-IP>:8086/hello/`. Then publish:

```bash
docker login -u <DOCKERHUB_USER>
docker push <DOCKERHUB_USER>/hello:latest
echo "https://hub.docker.com/r/<DOCKERHUB_USER>/hello" > dockerHubLink.txt
git add Dockerfile dockerHubLink.txt
git add -f hello.war             # only if A3 wants the WAR committed
git commit -m "Add Dockerfile and Docker Hub link"
git push
```

Clean up if the spec asks: `docker stop hello-container && docker rm hello-container`.

Names, ports and the image name in A3 will differ. Copy them from the spec, not from here.

---

## 8. Usernames and passwords (all `abc123`)

| Service                                                | Username                      | Password      | Notes                                                                                                                                                                                                                                             |
| ------------------------------------------------------ | ----------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jenkins first admin user                               | `admin`                     | `abc123`    | Full name Nguyen Ngoc Dung, email s3978535@rmit.edu.vn                                                                                                                                                                                            |
| Tomcat manager (`/opt/tomcat/conf/tomcat-users.xml`) | `admin`                     | `abc123`    | `<user username="admin" password="abc123" roles="manager-gui,admin-gui,manager-script,manager-jmx,manager-status"/>`                                                                                                                            |
| Extra Linux users (Docker/Ansible labs)                | `dockeradmin`, `ansadmin` | `abc123`    | `useradd dockeradmin` then `echo "dockeradmin:abc123" \| chpasswd`                                                                                                                                                                             |
| Docker Hub                                             | your existing username        | see note      | Docker Hub demands at least 9 characters, so`abc123` is rejected. Use `abc123abc` for the Docker Hub account and note it. Better: create an access token at hub.docker.com/settings/security and use it as the password for `docker login`. |
| GitHub                                                 | existing account              | do not change | GitHub does not accept this for git. Use SSH.                                                                                                                                                                                                     |

Two cautions. Tomcat manager and Jenkins sit on a public IP, so a guessable password gets probed quickly. Restrict the security group to your IP when you can, and terminate the instance after the assignment. Also, EC2 SSH password login is off by default on Amazon Linux, so if a lab step needs password ssh you must turn it on in `/etc/ssh/sshd_config` (`PasswordAuthentication yes`, then `systemctl restart sshd`); otherwise rely on keys.

---

## 9. Fallbacks if SSH to GitHub does not work

### 9.1 SSH blocked (port 22, campus Wi-Fi, "Connection timed out")

GitHub also listens on port 443. On the machine that fails, add to `~/.ssh/config`:

```
Host github.com
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_rsa
```

Then `ssh -T git@github.com` again.

### 9.2 Use a personal access token (HTTPS)

1. https://github.com/settings/tokens/new (a classic token), tick only `repo`, Expiration 7 days, Generate. Copy it immediately; it is shown once.
2. On the EC2:
   ```bash
   git config --global credential.helper store
   git clone https://github.com/rmit-vietnam-computing-technologies/2026b-cosc2767-a3-hn-ngocdungnguyen-s3978535.git
   ```

   Username: your GitHub username (from the `Hi <username>!` line). Password: the token, not `abc123`.
3. Never screenshot the token. If the org blocks classic tokens, you will get `Repository not found`; go back to SSH.

---

## 10. When something breaks (symptom, cause, fix)

| Symptom                                                        | Cause                                                                | Fix                                                                                                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Permission denied (publickey)` on `ssh -T git@github.com` | Public key not on GitHub, wrong key, or wrong user                   | `ssh -vT git@github.com` and see which key is offered. Re-add the `.pub` file. Make sure you are the same user that made the key.                           |
| `Repository not found` on clone                              | Wrong GitHub account, invite not accepted, or org SSO not authorised | Open the repo URL in your browser while logged in. If you see 404, accept the Classroom invite. If the key page shows`Configure SSO`, click it and authorise. |
| `UNPROTECTED PRIVATE KEY FILE`                               | `.pem` permissions too open                                        | Redo section 2.1.                                                                                                                                               |
| `Bad configuration option` in ssh config                     | File saved with BOM/UTF-16                                           | Recreate it with`Set-Content -Encoding ascii`.                                                                                                                |
| Git asks for a username and password on push                   | Remote is HTTPS                                                      | `git remote set-url origin git@github.com:rmit-vietnam-computing-technologies/2026b-cosc2767-a3-hn-ngocdungnguyen-s3978535.git`                               |
| `REMOTE HOST IDENTIFICATION HAS CHANGED`                     | New instance reused an old address                                   | `ssh-keygen -R <host>` on the PC.                                                                                                                             |
| Cannot reach EC2 (timeout)                                     | Instance stopped, IP changed, or security group missing your IP      | Recopy the Public DNS; check the security group's SSH rule.                                                                                                     |
| Prompt has no`s3978535` hostname                             | Hostname not persisted                                               | Section 4.1 fallback. Never take the screenshot until the prompt is right.                                                                                      |
| `mvn: command not found`                                     | New shell did not load the profile                                   | `source ~/.bash_profile` or use `sudo su -` (a login shell).                                                                                                |
| `rejected ... non-fast-forward` on push                      | The remote has a commit you lack                                     | `git pull --rebase origin <branch>`, then push again.                                                                                                         |
| A file you`git add`ed is missing on GitHub                   | `.gitignore` ignored it                                            | `git check-ignore -v <path>`, then `git add -f <path>` if allowed.                                                                                          |
| Script fails with`bad interpreter` or `^M`                 | Windows line endings                                                 | Write scripts on the EC2 with`nano`, or run `dos2unix`.                                                                                                     |
| File you wrote from PowerShell is garbage                      | PowerShell`>` writes UTF-16 in 5.1                                 | Do file editing on the EC2. If you must, use`Set-Content -Encoding ascii`.                                                                                    |

---

## 11. Final merge (last step in A1, worth 1 mark)

```bash
git checkout main
git pull origin main
git merge develop
git push origin main
git log --graph --oneline --decorate --all
```

Screenshot both the merge and the `git log` output. Confirm on GitHub that `main` shows all question folders.

## 12. Screenshot checklist

- Every terminal screenshot shows the required hostname in the prompt.
- Do not show private keys, tokens or the `abc123` passwords.
- Do the work on `develop` unless told otherwise, and re-check with `git branch` before each commit.
- Test everything before committing; A1 said "Test submission code carefully before submitting".
