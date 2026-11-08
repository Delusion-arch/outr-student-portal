# Changelog

## v1.0.0

First complete version.

- Student and admin sides: course catalog, enrollment requests, approvals, attendance, analytics
- Admin sign-up protected by an invite code
- Settings (JWT secret, CORS, API URL, mail, database path) come from environment variables
- Docker setup for backend and frontend, with docker-compose
- 18 API tests
- CI on every push and pull request, including a Docker Compose smoke test
- Docker images published to GitHub Container Registry on version tags

## v0.1.0

Early pre-release: environment-based configuration, Docker setup, API tests and CI.
