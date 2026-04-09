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
        
        print("--- PgBouncer Audit ---")
        out, _ = run_remote_cmd(client, "sudo cat /etc/pgbouncer/pgbouncer.ini | grep -E 'pool_mode|default_pool_size|max_client_conn'")
        print(out)
        
        print("--- Nginx Real-IP Audit ---")
        out, _ = run_remote_cmd(client, "sudo grep -r 'real_ip' /etc/nginx/sites-enabled/")
        print(out)
        
        print("--- PM2 Audit ---")
        out, _ = run_remote_cmd(client, "pm2 jlist | python3 -c 'import sys, json; d=json.load(sys.stdin); print([(a[\"name\"], a[\"pm2_env\"].get(\"instances\")) for a in d])'")
        print(out)

    finally:
        client.close()

if __name__ == "__main__":
    main()
