from locust import HttpUser, task, between

class InsightEdTeacher(HttpUser):
    # Mimics a teacher thinking/reading for 1-5 seconds
    wait_time = between(1, 5)

    @task(1)
    def load_pwa_main(self):
        # Hits the main PWA entry point
        self.client.get("/insighted/")

    @task(4)  # 4x more likely to simulate heavy search/sync traffic
    def inventory_sync(self):
        # Targeting the data-heavy part of the app
        # If your search uses a different path, e.g., /insighted/api/search, update here
        self.client.get("/insighted/api/inventory")

    @task(2)
    def check_dashboard(self):
        # Simulated dashboard refresh
        self.client.get("/insighted/dashboard")

    def on_start(self):
        """ Runs once per virtual teacher when they start their session """
        print("A virtual teacher has started accessing InsightEd...")