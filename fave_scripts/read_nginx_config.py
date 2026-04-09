import paramiko

SERVER_IP = "20.24.58.49"
USER = "Administrator1"
PASS = "7v52E69TYgTE"

def run_remote_cmd(client, cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8'), stderr.read().decode('utf-8')

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(hostname=SERVER_IP, port=22, username=USER, password=PASS)
        
        print("--- /etc/nginx/nginx.conf ---")
        out, err = run_remote_cmd(client, "sudo cat /etc/nginx/nginx.conf")
        print(out)
        
        print("\n--- Site Configurations ---")
        out, err = run_remote_cmd(client, "sudo ls /etc/nginx/sites-enabled/")
        sites = out.split()
        for site in sites:
            print(f"\n--- /etc/nginx/sites-enabled/{site} ---")
            out, err = run_remote_cmd(client, f"sudo cat /etc/nginx/sites-enabled/{site}")
            print(out)

    finally:
        client.close()

if __name__ == "__main__":
    main()
