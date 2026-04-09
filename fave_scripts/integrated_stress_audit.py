#!/usr/bin/env python3
"""
InsightEd Integrated Stress Audit Tool
Combines high-concurrency traffic simulation with real-time remote infrastructure diagnostics.
"""
import time
import threading
import urllib.request
import ssl
import random
import sys
import os

# Append system_scripts so we can import diagnose_pm2_errors
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "system_scripts"))
import diagnose_pm2_errors

# Colors
CYAN = '\033[96m'
YELLOW = '\033[93m'
GREEN = '\033[92m'
RED = '\033[91m'
RESET = '\033[0m'

class IntegratedSimulator:
    def __init__(self, target_url, num_users, env_name):
        self.target_url = target_url
        self.num_users = num_users
        self.env_name = env_name
        self.success_count = 0
        self.failure_count = 0
        self.active = True
        self.lock = threading.Lock()
        self.start_time = time.time()
        self.ssl_context = ssl._create_unverified_context()

    def simulate_user(self, user_id):
        while self.active:
            try:
                # Increased timeout to 15s for stress tests
                with urllib.request.urlopen(self.target_url, context=self.ssl_context, timeout=15) as response:
                    status = response.getcode()
                    if status == 200:
                        with self.lock:
                            self.success_count += 1
                    else:
                        with self.lock:
                            self.failure_count += 1
                
                # Stochastic delay: 0.5 to 2.0 seconds
                time.sleep(random.uniform(0.5, 2.0))
            except Exception:
                with self.lock:
                    self.failure_count += 1
                time.sleep(2.0)

    def print_status(self):
        elapsed = time.time() - self.start_time
        with self.lock:
            s = self.success_count
            f = self.failure_count
            
        print(f"\n{CYAN}======================================================================{RESET}")
        print(f"🚦  STRESS TEST STATUS [{elapsed:.1f}s elapsed]")
        print(f"    Target: {self.target_url}")
        print(f"    Users: {YELLOW}{self.num_users}{RESET} | Success: {GREEN}{s}{RESET} | Failed: {RED}{f}{RESET}")
        print(f"{CYAN}======================================================================{RESET}\n")

    def run(self):
        print(f"\n{CYAN}Launching Integrated Stress Audit for {self.env_name.upper()}{RESET}")
        print(f"{YELLOW}Press Ctrl+C to stop the audit.{RESET}\n")

        threads = []
        for i in range(self.num_users):
            t = threading.Thread(target=self.simulate_user, args=(i,), daemon=True)
            t.start()
            threads.append(t)

        try:
            # Polling loop
            while self.active:
                if self.env_name in ["staging", "production"]:
                    app_name = "insighted-backend" if self.env_name == "production" else "insighted-staging"
                    print(f"\n📡 Fetching infrastructure vitals for {self.env_name.upper()}...")
                    
                    # Fetch Vitals
                    vitals = diagnose_pm2_errors.get_system_vitals(f"Remote {self.env_name.upper()}")
                    
                    # Print stress test block
                    self.print_status()
                    
                    # Fetch PM2 Logs
                    cmd = f"pm2 logs {app_name} --lines 100 --nostream"
                    stdout, stderr = diagnose_pm2_errors.run_remote_command(cmd)
                    if stdout:
                        report = diagnose_pm2_errors.analyze_lines(stdout.splitlines())
                        diagnose_pm2_errors.print_audit_report(report, f"Remote {self.env_name.upper()} App: {app_name}", vitals)
                    else:
                        print(f"{RED}Failed to fetch remote logs: {stderr}{RESET}")
                        if vitals:
                            diagnose_pm2_errors.print_audit_report({}, f"Remote {self.env_name.upper()} App: {app_name} (Vitals Only)", vitals)
                else:
                    self.print_status()
                
                # Wait 10 seconds before next poll, but remain interruptible
                for _ in range(100):
                    if not self.active:
                        break
                    time.sleep(0.1)

        except KeyboardInterrupt:
            self.active = False
            elapsed = time.time() - self.start_time
            print(f"\n\n{CYAN}========================================================{RESET}")
            print(f"  Simulation & Audit Stopped. Final Report:")
            print(f"  Total Successes: {GREEN}{self.success_count}{RESET}")
            print(f"  Total Failures:  {RED}{self.failure_count}{RESET}")
            print(f"  Duration:        {elapsed:.1f}s")
            print(f"{CYAN}========================================================{RESET}")

def main():
    if sys.platform == 'win32':
        import os
        os.system('') 

    print(f"{CYAN}InsightEd Full-Stack Stress Audit Tool{RESET}")
    print(f"\n{YELLOW}Select Target Environment:{RESET}")
    print("1. Staging     (https://20.24.58.49/insighted-staging/api/health)")
    print("2. Production  (https://stride.deped.gov.ph/insighted/api/health)")
    print("3. Localhost   (http://127.0.0.1:3000/api/health)")
    print("4. Manual URL")
    
    choice = input(f"{CYAN}Choice (1-4): {RESET}").strip()
    
    env_name = "production"
    if choice == '1':
        target = "https://20.24.58.49/insighted-staging/api/health"
        env_name = "staging"
    elif choice == '2':
        target = "https://stride.deped.gov.ph/insighted/api/health"
        env_name = "production"
    elif choice == '3':
        target = "http://127.0.0.1:3000/api/health"
        env_name = "localhost"
    elif choice == '4':
        target = input(f"{CYAN}Enter full URL: {RESET}").strip()
        env_name = "manual"
    else:
        print(f"{YELLOW}Invalid choice, defaulting to Production.{RESET}")
        target = "https://stride.deped.gov.ph/insighted/api/health"

    try:
        val = input(f"\n{YELLOW}How many concurrent users to simulate? {RESET}")
        num_users = int(val)
        
        sim = IntegratedSimulator(target, num_users, env_name)
        sim.run()
        
    except ValueError:
        print(f"{RED}Error: Please enter a valid number.{RESET}")
    except Exception as e:
        print(f"{RED}Unexpected error: {e}{RESET}")

if __name__ == "__main__":
    main()
