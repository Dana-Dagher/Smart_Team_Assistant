# Mini Project: Hybrid Task Assignment System

## Overview
This project is a full-stack web application for team task management, featuring a hybrid assignment system that combines rule-based logic and AI (via Ollama/Mistral) to assign tasks to team members based on their skills and past projects.

- **Backend:** Flask (Python), SQLite, SQLAlchemy, Flask-Migrate
- **Frontend:** React (JavaScript)
- **AI Integration:** Ollama (Mistral model)

## Features
- User authentication (login/register)
- Role-based access: `teamLead` and `teamMember`
- Task CRUD (create, read, update, delete)
- Task assignment (manual, rule-based, and AI-assisted)
- User profiles with skills and past projects
- Filtering and sorting tasks
- CORS enabled for frontend-backend communication

## Project Structure
```
mini_project/
├── backend/
│   ├── app.py           # Flask backend (main API)
│   ├── site.db          # SQLite database
│   └── migrations/      # Alembic migration files
├── frontend/
│   ├── package.json     # React project config
│   ├── public/          # Static assets
│   └── src/             # React source code
```

## Backend Setup
1. **Install dependencies:**
   ```powershell
   cd backend
   pip install flask flask-cors flask-sqlalchemy flask-migrate requests werkzeug
   ```
2. **Run migrations:**
   ```powershell
   flask db init   # Only once
   flask db migrate -m "Initial migration"
   flask db upgrade
   ```
3. **Start the backend server:**
   ```powershell
   python app.py
   ```
   The backend runs on [http://localhost:5000](http://localhost:5000).

## Frontend Setup
1. **Install dependencies:**
   ```powershell
   cd frontend
   npm install
   ```
2. **Start the frontend server:**
   ```powershell
   npm start
   ```
   The frontend runs on [http://localhost:3000](http://localhost:3000).

## AI Integration (Ollama)
- The backend uses Ollama's Mistral model for AI-based task assignment.
- Ensure Ollama is running locally:
  - [Ollama installation guide](https://ollama.com/)
  - Start Ollama server: `ollama serve`
  - Pull the Mistral model: `ollama pull mistral`

## API Endpoints (Backend)
- `POST /login` — User login
- `POST /users` — Register new user
- `GET /users` — List users
- `GET/POST /tasks` — List/create tasks
- `PUT /tasks/<task_id>` — Update task
- `PUT /tasks/<task_id>/status` — Update task status
- `DELETE /tasks/<task_id>` — Delete task
- `POST /assign_task_ai` — Hybrid AI/rule-based task assignment

## Environment & Requirements
- Python 3.11+
- Node.js 18+
- SQLite (bundled)
- Ollama (for AI features)

## Notes
- Passwords are securely hashed using Werkzeug.
- The assignment system first tries rule-based logic, then falls back to AI if ambiguous.
- All code is unchanged from the original source files.

## License
This project is for educational/demo purposes.
