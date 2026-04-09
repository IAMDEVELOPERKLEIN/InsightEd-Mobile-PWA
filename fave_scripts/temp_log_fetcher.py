import paramiko
import sys

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
        
        print("--- Nginx Error Log (Last 20 lines) ---")
        out, err = run_remote_cmd(client, "sudo tail -n 20 /var/log/nginx/error.log")
        print(out)
        
        print("\n--- Nginx Access Log (Last 10 lines with 503 or 504) ---")
        out, err = run_remote_cmd(client, "sudo grep -E ' 503 | 504 ' /var/log/nginx/access.log | tail -n 10")
        print(out)
        
        print("\n--- PM2 Logs for insighted-backend (Last 20 lines) ---")
        out, err = run_remote_cmd(client, "pm2 logs insighted-backend --lines 20 --no-daemon")
        # pm2 logs output goes to stderr usually or we need to capture it differently
        # Actually pm2 logs without --no-daemon might not work well here.
        # Let's try reading the log files directly.
        out, err = run_remote_cmd(client, "ls -rt ~/.pm2/logs/insighted-backend-out*.log | tail -n 1")
        last_log = out.strip()
        if last_log:
            print(f"Reading {last_log}...")
            out, err = run_remote_cmd(client, f"tail -n 20 {last_log}")
            print(out)
            
        out, err = run_remote_cmd(client, "ls -rt ~/.pm2/logs/insighted-backend-error*.log | tail -n 1")
        last_err_log = out.strip()
        if last_err_log:
             print(f"\nReading {last_err_log}...")
             out, err = run_remote_cmd(client, f"tail -n 20 {last_err_log}")
             print(out)

    finally:
        client.close()

if __name__ == "__main__":
    main()
