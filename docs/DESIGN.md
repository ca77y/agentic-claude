# Design

The principles every design, card, and change in this repo is weighed against. How the plugins are built is in [`ARCHITECTURE.md`](ARCHITECTURE.md).

- **Least effort, most result.** This is one person's side project. Prefer what already exists, configuration, and managed services over new code or infrastructure. Cut scope until each step is small enough to deliver on its own and is useful before the next one lands.
- **Nothing runs by hand on a laptop.** Telemetry is collected and shipped to GCP automatically. Investigations, analysis, and improvements run in claude.ai cloud sessions, which read that telemetry from GCP.
