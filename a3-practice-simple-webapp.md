# Practice: Simple-Webapp-COSC2767 (Q1 + Q2)

Repo for all the EC2 work: https://github.com/NgocDungNguyen/Simple-Webapp-COSC2767
Clone address (SSH): `git@github.com:NgocDungNguyen/Simple-Webapp-COSC2767.git`

How to read this page:

- A code block is something to copy and run, or file content to paste. Every code block has a Copy button.
- What you should see is written as plain text after the word **Expect**. Never paste it into the terminal.
- `powershell` blocks run on your PC. `bash` blocks run on the EC2 as root. `<...>` means fill in your own value.

Two different repos, do not mix them up:

- `Simple-Webapp-COSC2767` is where your EC2 work goes. Look here for `question-1` and `question-2`.
- `practice` is only this guide website. Nothing from the EC2 ever appears there.
- On GitHub, `question-1` and `question-2` appear on branch `develop` first. They appear on `main` only after Step 9. Switch branches with the branch dropdown at the top left of the file list.

Final layout on `main` (same as `sample/`):

- `README.md`
- `question-1/hello/pom.xml`
- `question-1/hello/src/main/webapp/index.jsp`
- `question-1/hello/src/main/webapp/WEB-INF/web.xml`
- `question-1/hello/target/hello.war`
- `question-1/hello/target/hello/index.jsp`
- `question-1/hello/target/hello/WEB-INF/web.xml`
- `question-1/hello/target/maven-archiver/pom.properties`
- `question-2/Dockerfile`
- `question-2/hello.war`
- `question-2/dockerHubLink.txt`

---

## Step 1. Create the EC2 instance

1. Learner Lab: click **Start Lab**. Wait until the AWS dot is green. Click **AWS**.
2. Top-right region: **US East (N. Virginia) us-east-1**.
3. **EC2** > **Instances** > **Launch instances**.
4. Fill the form exactly:

| Field | Value |
|---|---|
| Name | `DevOps-Practice` |
| Application and OS Images | Quick Start > **Amazon Linux** > **Amazon Linux 2023 AMI**, 64-bit (x86) |
| Instance type | **t3.medium** |
| Key pair | Existing: `devops_project_key`. If none: **Create new key pair**, name `devops_project_key`, type **RSA**, format **.pem**, Create (file downloads) |
| Storage | 1 volume, **20 GiB**, **gp3** |

5. **Network settings** > click **Edit**, then set:

| Field | Value |
|---|---|
| VPC | default |
| Subnet | No preference |
| Auto-assign public IP | **Enable** |
| Firewall (security groups) | **Create security group** |
| Security group name | `Practice_Security_Group` |
| Description | `Practice SG` |

6. **Inbound security group rules**: keep the SSH row, then click **Add security group rule** three times. End result must be exactly:

| # | Type | Protocol | Port range | Source type | Source | Purpose |
|---|---|---|---|---|---|---|
| 1 | SSH | TCP | 22 | Anywhere | 0.0.0.0/0 | SSH |
| 2 | Custom TCP | TCP | 8080 | Anywhere | 0.0.0.0/0 | Jenkins |
| 3 | Custom TCP | TCP | 9535 | Anywhere | 0.0.0.0/0 | Tomcat |
| 4 | Custom TCP | TCP | 8086 | Anywhere | 0.0.0.0/0 | Docker container |

7. Leave **Advanced details** as default. Click **Launch instance**.
8. **Instances** > wait for **Instance state = Running** and **Status check = 2/2 checks passed**.
9. Click the instance > copy **Public IPv4 DNS** (looks like `ec2-1-2-3-4.compute-1.amazonaws.com`).

Edit rules later: instance > **Security** tab > click the security group > **Edit inbound rules** > **Add rule** > **Save rules**.

Public DNS changes every time the lab stops and starts. Copy it again each session.

---

## Step 2. Connect from PowerShell

Rules for this step:

- Copy and run **one block at a time**. Wait for the prompt to come back before the next block.
- `$KEY` and `$HOST_` are forgotten when you close the PowerShell window. In a new window, run 2.2 and 2.6 again.
- Always connect with `-i $KEY` (the full path). Never write just `devops_project_key.pem`.

### 2.1 Go to your home folder

```powershell
cd $HOME
```
Expect: the prompt ends with `PS C:\Users\LucyS>`.

### 2.2 Set the key path

```powershell
$KEY = "$HOME\.ssh\devops_project_key.pem"
```

### 2.3 Find the key file

```powershell
Get-ChildItem "$HOME\Downloads\*.pem", "$HOME\.ssh\*.pem" | Select-Object FullName
```
Expect: one path listed.

- Listed under `Downloads`: do 2.4.
- Listed under `.ssh` as `devops_project_key.pem`: it is already in place, skip 2.4.
- File name differs (for example `devops_project_key (1).pem`): use that exact name in 2.4.
- Nothing listed: AWS only lets you download a `.pem` once, at creation. Launch a new instance with a new key pair (Step 1).

### 2.4 Move the key into `.ssh` (once)

```powershell
Move-Item "$HOME\Downloads\devops_project_key.pem" $KEY
```
Error `Cannot find path ... Downloads`: if 2.3 showed the file under `.ssh`, it is already moved. Continue.

### 2.5 Lock the key permissions (one command, do not split it)

```powershell
icacls $KEY /inheritance:r /grant:r "$($env:USERNAME):(R)"
```
Expect: `Successfully processed 1 files; Failed processing 0 files`.

Check it:

```powershell
icacls $KEY
```
Expect: exactly one entry, your user with `(R)`. Anything else: run the 2.5 command again.

### 2.6 Connect

Copy the **Public IPv4 DNS** from the EC2 console (it changes every lab session) and paste it between the quotes, replacing `<PUBLIC-IPV4-DNS>` including the angle brackets:

```powershell
$HOST_ = "<PUBLIC-IPV4-DNS>"
```

```powershell
ssh -o ServerAliveInterval=60 -i $KEY ec2-user@$HOST_
```
Type `yes` at the first prompt. Expect: `[ec2-user@ip-... ~]$`.

### If it fails

| Message | Fix |
|---|---|
| `Identity file ... not accessible` | `$KEY` is empty or wrong. Run 2.2 again, then `Test-Path $KEY` must print `True`. |
| `UNPROTECTED PRIVATE KEY FILE` | Run the 2.5 command again. |
| `Permission denied (publickey...)` | The `.pem` is not the key this instance was launched with. EC2 console > your instance > Details > **Key pair name** must match the `.pem` you use. The user must be `ec2-user`. |
| `REMOTE HOST IDENTIFICATION HAS CHANGED` | Run `ssh-keygen -R $HOST_`, then connect again. |
| `Connection timed out` | Wrong DNS (it changed), instance not `Running`, or the port 22 rule is missing from the security group. |
| `Invalid parameter` or two commands on one line | Two blocks were pasted together. Run one block at a time. |

---

## Step 3. Root and hostname

```bash
sudo su -
hostnamectl set-hostname s3978535-practice-2026b
reboot
```
Wait 1 minute. Reconnect (Step 2 `ssh` line), then:

```bash
sudo su -
```
Expect: `[root@s3978535-practice-2026b ~]#`

Prompt still shows `ip-...`:

```bash
echo "preserve_hostname: true" >> /etc/cloud/cloud.cfg
hostnamectl set-hostname s3978535-practice-2026b
reboot
```

---

## Step 4. Git, SSH key, clone

```bash
dnf install -y git
git config --global user.name "Nguyen Ngoc Dung"
git config --global user.email "s3978535@rmit.edu.vn"
git config --global init.defaultBranch main
ssh-keygen -t rsa -b 4096 -C "s3978535@rmit.edu.vn" -N "" -f ~/.ssh/id_rsa
cat ~/.ssh/id_rsa.pub
```

Add the key to GitHub (signed in as `NgocDungNguyen`):
1. Open https://github.com/settings/ssh/new
2. Title: `practice-ec2`. Key type: **Authentication Key**.
3. Paste the `cat` output. Click **Add SSH key**.

Shortcut: run this in a second PowerShell window, then paste in GitHub:

```powershell
ssh -i $KEY ec2-user@$HOST_ "sudo cat /root/.ssh/id_rsa.pub" | Set-Clipboard
```

Test and clone:

```bash
ssh -T git@github.com
```
Type `yes`. Expect: `Hi NgocDungNguyen! You've successfully authenticated, but GitHub does not provide shell access.`

```bash
cd ~
git clone git@github.com:NgocDungNguyen/Simple-Webapp-COSC2767.git
cd Simple-Webapp-COSC2767
git remote -v
```
Expect: both lines start with `git@github.com:`.

`Permission denied (publickey)`: key not saved on GitHub, or you are not root. Run `ssh -vT git@github.com`.

---

## Step 5. Install Java, Maven, Docker

```bash
dnf install -y java-21-amazon-corretto-devel docker
java -version
```

```bash
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

```bash
systemctl enable --now docker
docker version
systemctl status docker --no-pager
cd ~/Simple-Webapp-COSC2767
```
Expect: `java -version` shows 21, `mvn -version` shows 3.9.11, `docker version` shows Client and Server, Docker status `active (running)`.

---

## Step 6. Create develop and clear the old files

```bash
git checkout -b develop
git rm -r pom.xml src
git commit -m "Remove old root-level webapp"
git push -u origin develop
```

Check on GitHub: https://github.com/NgocDungNguyen/Simple-Webapp-COSC2767/tree/develop
The branch dropdown must say `develop`. Expect: only `README.md` in the list (`pom.xml` and `src` are gone).

---

## Step 7. Question 1 (Maven web app)

```bash
mkdir question-1
cd question-1
mvn archetype:generate -DgroupId=vn.edu.rmit -DartifactId=hello -DarchetypeArtifactId=maven-archetype-webapp -DinteractiveMode=false
cd hello
nano src/main/webapp/index.jsp
```

Replace the whole file with:

```html
<html>
<body>
<h2>[2026B] I am Nguyen Ngoc Dung - s3978535 from the DevOps final exam</h2>
</body>
</html>
```
Save: `Ctrl+O`, `Enter`, `Ctrl+X`.

```bash
mvn package
find target -type f | sort
```
Expect: `BUILD SUCCESS`, then these 4 lines as output (do not paste them):

- `target/hello.war`
- `target/hello/WEB-INF/web.xml`
- `target/hello/index.jsp`
- `target/maven-archiver/pom.properties`

```bash
cd ~/Simple-Webapp-COSC2767
git add question-1
git status --short
git commit -m "Set up Maven web application"
git push
```

Check on GitHub: https://github.com/NgocDungNguyen/Simple-Webapp-COSC2767/tree/develop/question-1
The branch dropdown must say `develop`. Expect: a folder `hello`.

---

## Step 8. Question 2 (Docker)

```bash
mkdir question-2
cd question-2
cp ../question-1/hello/target/hello.war .
nano Dockerfile
```

File content:

```
FROM tomcat:latest
RUN cp -R /usr/local/tomcat/webapps.dist/* /usr/local/tomcat/webapps
COPY ./*.war /usr/local/tomcat/webapps
```

```bash
docker build -t <DOCKERHUB_USER>/hello:latest .
docker run -d --name hello-container -p 8086:8080 <DOCKERHUB_USER>/hello:latest
docker ps
```
Wait 10 seconds, then:

```bash
curl -s http://localhost:8086/hello/
```
Expect: output contains `I am Nguyen Ngoc Dung`.
Browser: `http://<EC2-PUBLIC-IP>:8086/hello/` shows the same heading.

Push the image and record the link:

```bash
docker login -u <DOCKERHUB_USER>
docker push <DOCKERHUB_USER>/hello:latest
echo "https://hub.docker.com/r/<DOCKERHUB_USER>/hello" > dockerHubLink.txt
```

Commit:

```bash
cd ~/Simple-Webapp-COSC2767
git add question-2
git commit -m "Add Dockerfile and Docker Hub link"
git push
```

Check on GitHub: https://github.com/NgocDungNguyen/Simple-Webapp-COSC2767/tree/develop/question-2
The branch dropdown must say `develop`. Expect: `Dockerfile`, `dockerHubLink.txt`, `hello.war`.

Stop the container:

```bash
docker stop hello-container
docker rm hello-container
docker ps -a
```
Expect: no `hello-container` row.

---

## Step 9. README and merge to main

```bash
nano README.md
```
Replace with:

```
# Simple-Webapp-COSC2767
COSC2767 Systems Deployment and Operations
Nguyen Ngoc Dung - s3978535 - GitHub: NgocDungNguyen
```

```bash
git add README.md
git commit -m "Edit the README file"
git push
git checkout main
git pull origin main
git merge develop
git push origin main
git log --graph --oneline --decorate --all
```

---

## Step 10. Check the result

```bash
git ls-files | sort
```
Expect: the 11 files listed at the top of this page, nothing else.

Then open https://github.com/NgocDungNguyen/Simple-Webapp-COSC2767
The branch dropdown must say `main`. Expect: `question-1`, `question-2`, `README.md`.

---

# Add-ons (only for later weeks)

## A. Tomcat on port 9535

Security rule needed: TCP 9535 (already in Step 1).

```bash
cd /opt
wget https://archive.apache.org/dist/tomcat/tomcat-9/v9.0.97/bin/apache-tomcat-9.0.97.tar.gz
tar -xvzf apache-tomcat-9.0.97.tar.gz
mv apache-tomcat-9.0.97 tomcat
ln -s /opt/tomcat/bin/startup.sh /usr/local/bin/tomcatup
ln -s /opt/tomcat/bin/shutdown.sh /usr/local/bin/tomcatdown
sed -i 's/port="8080"/port="9535"/' /opt/tomcat/conf/server.xml
grep -n 'port="9535"' /opt/tomcat/conf/server.xml
tomcatup
cp ~/Simple-Webapp-COSC2767/question-1/hello/target/hello.war /opt/tomcat/webapps/
```
Browser: `http://<EC2-PUBLIC-IP>:9535/hello/`

## B. Jenkins on port 8080

Security rule needed: TCP 8080 from Anywhere (already in Step 1). GitHub webhooks need it open.

```bash
wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/rpm-stable/jenkins.repo
dnf install -y fontconfig jenkins
service jenkins start
cat /var/lib/jenkins/secrets/initialAdminPassword
```

1. Browser: `http://<EC2-PUBLIC-IP>:8080`. Paste the password.
2. **Install suggested plugins**.
3. **Create First Admin User**: username `admin`, full name `Nguyen Ngoc Dung`, email `s3978535@rmit.edu.vn`.
4. **Manage Jenkins** > **Tools**:
   - JDK: name `jdk21`, uncheck install automatically, JAVA_HOME `/usr/lib/jvm/java-21-amazon-corretto`.
   - Maven: name `maven`, uncheck install automatically, MAVEN_HOME `/opt/maven`.
5. **New Item** > name `devops-ci-s3978535` > **Freestyle project**.
6. Source Code Management: **Git**, Repository URL `https://github.com/NgocDungNguyen/Simple-Webapp-COSC2767.git`, Branch `*/develop`.
7. Build Steps > **Invoke top-level Maven targets**: Maven `maven`, Goals `clean package`, Advanced > POM `question-1/hello/pom.xml`.
8. **Save** > **Build Now**. Expect: `Finished: SUCCESS`.

Webhook:
1. GitHub repo > **Settings** > **Webhooks** > **Add webhook**.
2. Payload URL `http://<EC2-PUBLIC-IP>:8080/github-webhook/`, Content type `application/json`, event **Just the push event**. Add webhook.
3. Jenkins job > **Configure** > Triggers > tick **GitHub hook trigger for GITScm polling** > Save.
4. Push any change to `develop`. Expect: a new build starts by itself.

## C. Ansible (single server)

Security rule needed: none for one server. For several servers: TCP 22 from the shared security group.

```bash
yum install -y ansible
ansible --version
useradd ansibleadmin
usermod -aG docker ansibleadmin
echo "ansibleadmin ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/ansibleadmin
echo "localhost ansible_connection=local" >> /etc/ansible/hosts
su - ansibleadmin -c "ansible all -m ping"
```
Expect: `pong`. If `yum install ansible` finds no package: `dnf install -y python3-pip && pip3 install ansible`.

## D. Extra security rules per tool

| Tool | Add these inbound rules (TCP unless noted) |
|---|---|
| Tomcat | 9535 (or 8080 when Jenkins is not on the same server) |
| Jenkins | 8080 |
| Docker containers | 8086, or 8080-8090 for many containers |
| Ansible (several servers) | 22 from the shared security group |
| Docker Swarm | 2376, 2377, 7946 TCP, 7946 UDP, 4789 UDP, 8080-8090 |
| Minikube | 30000-32767 |

---

## Clean up

```bash
docker system prune -a
```
AWS: **EC2** > **Instances** > select > **Instance state** > **Terminate instance**. Delete leftover volumes and snapshots.
GitHub: remove the `practice-ec2` key at https://github.com/settings/keys.
