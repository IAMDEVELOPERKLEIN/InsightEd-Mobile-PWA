#!/usr/bin/env python3
import threading
import time
import random
import urllib.request
import sys
import ssl

# Colors for pretty output
GREEN = '\033[92m'
RED = '\033[91m'
CYAN = '\033[96m'
YELLOW = '\033[93m'
RESET = '\033[0m'

class TrafficSimulator:
    def __init__(self, target_url, num_users):
        self.target_url = target_url
        self.num_users = num_users
        self.success_count = 0
        self.failure_count = 0
        self.active = True
        self.lock = threading.Lock()
        self.start_time = time.time()
        
        # Create unverified SSL context for staging IPs/self-signed certs
        self.ssl_context = ssl._create_unverified_context()

    def simulate_user(self, user_id):
        while self.active:
            try:
                # Perform the request with unverified SSL context
                # Timeout of 10s to prevent hanging
                with urllib.request.urlopen(self.target_url, context=self.ssl_context, timeout=10) as response:
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
                time.sleep(2.0) # Wait a bit more on error

    def display_stats(self):
        while self.active:
            elapsed = time.time() - self.start_time
            with self.lock:
                s = self.success_count
                f = self.failure_count
            
            # Print status line (using \r to overwrite)
            sys.stdout.write(
                f"\r{CYAN}[SIMULATION]{RESET} Users: {YELLOW}{self.num_users}{RESET} | "
                f"Succeeded: {GREEN}{s}{RESET} | "
                f"Failed: {RED}{f}{RESET} | "
                f"Elapsed: {elapsed:.1f}s"
            )
            sys.stdout.flush()
            time.sleep(0.5)

    def start(self):
        print(f"{CYAN}========================================================{RESET}")
        print(f"  InsightEd Traffic Simulator — Launching {self.num_users} Users")
        print(f"  Target: {self.target_url}")
        print(f"{CYAN}========================================================{RESET}")
        print(f"{YELLOW}Press Ctrl+C to stop the simulation.{RESET}\n")

        threads = []
        # Start user simulations
        for i in range(self.num_users):
            t = threading.Thread(target=self.simulate_user, args=(i,), daemon=True)
            t.start()
            threads.append(t)

        # Start stats display
        stats_thread = threading.Thread(target=self.display_stats, daemon=True)
        stats_thread.start()

        try:
            while self.active:
                time.sleep(0.1)
        except KeyboardInterrupt:
            self.stop()

    def stop(self):
        self.active = False
        print(f"\n\n{CYAN}========================================================{RESET}")
        print(f"  Simulation Stopped. Final Report:")
        print(f"  Total Successes: {GREEN}{self.success_count}{RESET}")
        print(f"  Total Failures:  {RED}{self.failure_count}{RESET}")
        print(f"  Duration:        {time.time() - self.start_time:.1f}s")
        print(f"{CYAN}========================================================{RESET}")

def main():
    # Make sure stdout supports escapes on Windows
    if sys.platform == 'win32':
        import os
        os.system('') # Enables VT100 colors

    try:
        print(f"{CYAN}InsightEd Traffic Simulation Tool{RESET}")
        
        # 1. Select Environment
        print(f"\n{YELLOW}Select Target Environment:{RESET}")
        print("1. Localhost   (http://127.0.0.1:3000/api/health)")
        print("2. Staging     (https://20.24.58.49/insighted-staging/api/health)")
        print("3. Production  (https://stride.deped.gov.ph/insighted/api/health)")
        print("4. Manual URL")
        
        choice = input(f"{CYAN}Choice (1-4): {RESET}").strip()
        
        if choice == '1':
            target = "http://127.0.0.1:3000/api/health"
        elif choice == '2':
            target = "https://20.24.58.49/insighted-staging/api/health"
        elif choice == '3':
            target = "https://stride.deped.gov.ph/insighted/api/health"
        elif choice == '4':
            target = input(f"{CYAN}Enter full URL: {RESET}").strip()
        else:
            print(f"{YELLOW}Invalid choice, defaulting to Production.{RESET}")
            target = "https://stride.deped.gov.ph/insighted/api/health"

        # 2. Input user count
        val = input(f"\n{YELLOW}How many users do you want to simulate? {RESET}")
        num_users = int(val)
        
        simulator = TrafficSimulator(target, num_users)
        simulator.start()
        
    except ValueError:
        print(f"{RED}Error: Please enter a valid number.{RESET}")
    except Exception as e:
        print(f"{RED}Unexpected error: {e}{RESET}")

if __name__ == "__main__":
    main()
