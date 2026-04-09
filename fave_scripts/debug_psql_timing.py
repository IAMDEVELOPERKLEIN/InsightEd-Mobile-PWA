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
        
        print("Test 1: with -t")
        out, err = run_remote_cmd(client, 'sudo -u postgres psql -t -c "\\timing" -c "SELECT 1"')
        print(f"STDOUT: {out}")
        print(f"STDERR: {err}")
        
        print("\nTest 2: without -t")
        out, err = run_remote_cmd(client, 'sudo -u postgres psql -c "\\timing" -c "SELECT 1"')
        print(f"STDOUT: {out}")
        print(f"STDERR: {err}")

    finally:
        client.close()

if __name__ == "__main__":
    main()
