# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate 
import os
import requests 
import json
from werkzeug.security import generate_password_hash, check_password_hash 

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- Database Configuration ---
# Get the absolute path to the directory where app.py is located
basedir = os.path.abspath(os.path.dirname(__file__))
# Define the path for the SQLite database file
db_path = os.path.join(basedir, 'site.db')

app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Suppress a warning

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# --- Define Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False) # In a real app, hash this!
    role = db.Column(db.String(50), nullable=False, default='teamMember') # 'teamLead' or 'teamMember'
     # New fields for AI and Rule-Based System:
    skills = db.Column(db.Text, nullable=True, default="") # e.g., "React, Python, SQL, Project Management"
    past_projects = db.Column(db.Text, nullable=True, default="") # e.g., "E-commerce Backend, Mobile App UI, Data Analysis Report"
    # You could also add fields for availability if desired, e.g., 'status': db.Column(db.String(50), default='Available')
    
    # Relationships: a user can be assigned many tasks
    assigned_tasks = db.relationship('Task', backref='assignee', lazy=True)

    def __repr__(self):
        return f'<User {self.username} ({self.role})>'

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='Pending') # e.g., 'Pending', 'Ongoing', 'Done'
    deadline = db.Column(db.String(20), nullable=True) # Storing as string for simplicity (e.g., "May 6")
    assigned_to_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # Can be None if not assigned yet
    assignment_explanation = db.Column(db.Text, nullable=True) # From ChatGPT

    def __repr__(self):
        return f'<Task {self.title} - {self.status}>'

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password') # This 'password' variable should contain the plain-text password from the frontend

    print(f"Attempting login for: {username}") # DEBUG
    print(f"Received password (plain-text expected): {password}") # DEBUG

    if not username or not password:
        print("Missing username or password.") # DEBUG
        return jsonify({"message": "Username and password are required"}), 400

    user = User.query.filter_by(username=username).first()

    if user:
        print(f"User found in DB. Stored hashed password: {user.password}") # DEBUG

        # This is the crucial comparison
        is_password_correct = check_password_hash(user.password, password)
        print(f"Result of check_password_hash('{user.password}', '{password}'): {is_password_correct}") # DEBUG

        if is_password_correct:
            return jsonify({
                "message": "Login successful!",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "role": user.role,
                    "skills": user.skills,
                    "past_projects": user.past_projects
                },
                "success": True
            }), 200
        else:
            print("Password check failed.") # DEBUG
            return jsonify({"message": "Invalid username or password", "success": False}), 401
    else:
        print("User not found.") # DEBUG
        return jsonify({"message": "Invalid username or password", "success": False}), 401

@app.route('/tasks', methods=['GET', 'POST'])
def handle_tasks():
    if request.method == 'GET':
        # --- Existing logic from get_tasks() for GET requests ---
        status_filter = request.args.get('status')
        assigned_to_id_filter = request.args.get('assigned_to_id', type=int)
        sort_by = request.args.get('sort_by', 'id') # Default sort by id
        order = request.args.get('order', 'asc') # Default order ascending

        query = Task.query

        # Apply filters
        if status_filter and status_filter != 'All':
            query = query.filter_by(status=status_filter)

        if assigned_to_id_filter:
            if assigned_to_id_filter == -1:
                query = query.filter(Task.assigned_to_id == None)
            else:
                query = query.filter_by(assigned_to_id=assigned_to_id_filter)

        # Apply sorting
        if sort_by == 'deadline':
            if order == 'asc':
                query = query.order_by(Task.deadline.asc())
            else:
                query = query.order_by(Task.deadline.desc())
        elif sort_by == 'title':
            if order == 'asc':
                query = query.order_by(Task.title.asc())
            else:
                query = query.order_by(Task.title.desc())
        elif sort_by == 'id':
            if order == 'asc':
                query = query.order_by(Task.id.asc())
            else:
                query = query.order_by(Task.id.desc())
        # You might add a default sorting for unspecified `sort_by` at the very end

        tasks = query.all()

        tasks_data = []
        for task in tasks:
            assigned_user = User.query.get(task.assigned_to_id) if task.assigned_to_id else None
            tasks_data.append({
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "assigned_to": assigned_user.username if assigned_user else "Unassigned",
                "assigned_to_id": task.assigned_to_id,
                "status": task.status,
                "deadline": task.deadline,
                "assignment_explanation": task.assignment_explanation
            })
        return jsonify(tasks_data), 200

    elif request.method == 'POST':
        # --- Existing logic from the POST part of the original tasks() function ---
        data = request.get_json()

        title = data.get('title')
        description = data.get('description')
        status = data.get('status', 'Pending')
        deadline = data.get('deadline')
        assigned_to_id = data.get('assigned_to_id')
        assignment_explanation = data.get('assignment_explanation')

        if not title:
            return jsonify({"error": "Title is required"}), 400

        if assigned_to_id is not None:
            user_exists = User.query.get(assigned_to_id)
            if not user_exists:
                return jsonify({"error": "Assigned user not found"}), 400

        new_task = Task(
            title=title,
            description=description,
            status=status,
            deadline=deadline,
            assigned_to_id=assigned_to_id,
            assignment_explanation=assignment_explanation
        )

        try:
            db.session.add(new_task)
            db.session.commit()
            assignee_name = new_task.assignee.username if new_task.assignee else 'Unassigned'
            return jsonify({
                "message": "Task created successfully",
                "task": {
                    "id": new_task.id,
                    "title": new_task.title,
                    "description": new_task.description,
                    "status": new_task.status,
                    "deadline": new_task.deadline,
                    "assigned_to": assignee_name,
                    "assigned_to_id": new_task.assigned_to_id,
                    "assignment_explanation": new_task.assignment_explanation
                }
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to create task: {str(e)}"}), 500

@app.route('/tasks/<int:task_id>', methods=['PUT']) # New endpoint for updating a specific task
def update_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404 # 404 Not Found

    data = request.get_json()

    # Update fields if provided in the request body
    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'status' in data:
        task.status = data['status']
    if 'deadline' in data:
        task.deadline = data['deadline']

    # Handle assigned_to_id carefully:
    # If 'assigned_to_id' is explicitly null or provided
    if 'assigned_to_id' in data:
        assigned_id = data['assigned_to_id']
        if assigned_id is not None:
            user_exists = User.query.get(assigned_id)
            if not user_exists:
                return jsonify({"error": "Assigned user not found"}), 400
            task.assigned_to_id = assigned_id
        else: # If explicitly set to null, unassign the task
            task.assigned_to_id = None

    if 'assignment_explanation' in data:
        task.assignment_explanation = data['assignment_explanation']

    try:
        db.session.commit()
        # Return the updated task's data
        assignee_name = task.assignee.username if task.assignee else 'Unassigned'
        return jsonify({
            "message": "Task updated successfully",
            "task": {
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "deadline": task.deadline,
                "assigned_to": assignee_name,
                "assigned_to_id": task.assigned_to_id,
                "assignment_explanation": task.assignment_explanation
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update task: {str(e)}"}), 500

@app.route('/tasks/<int:task_id>/status', methods=['PUT'])
def update_task_status(task_id):
    data = request.get_json()
    new_status = data.get('status')
    current_user_id = data.get('current_user_id') # We'll send this from frontend
    current_user_role = data.get('current_user_role') # We'll send this from frontend

    if not new_status:
        return jsonify({"error": "New status is required."}), 400

    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found."}), 404

    # Basic Authorization Check:
    # Only the assigned user OR a teamLead can update status
    if current_user_role == 'teamMember' and task.assigned_to_id != current_user_id:
        return jsonify({"error": "You are not authorized to update this task's status."}), 403 # Forbidden

    # Valid status transitions (optional, but good practice)
    # You can define a more complex state machine if needed
    valid_statuses = ['Pending', 'Ongoing', 'Done', 'Blocked']
    if new_status not in valid_statuses:
        return jsonify({"error": f"Invalid status: {new_status}. Must be one of {valid_statuses}."}), 400

    try:
        task.status = new_status
        db.session.commit()
        return jsonify({
            "message": "Task status updated successfully",
            "task_id": task.id,
            "new_status": task.status
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/tasks/<int:task_id>', methods=['DELETE']) # New endpoint for deleting a specific task
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404 # 404 Not Found

    try:
        db.session.delete(task)
        db.session.commit()
        return jsonify({"message": "Task deleted successfully"}), 200 # 200 OK
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete task: {str(e)}"}), 500

# Helper function to interact with Ollama
def get_ollama_response(prompt_text, model="mistral"):
    ollama_api_url = "http://localhost:11434/api/generate"
    headers = {'Content-Type': 'application/json'}
    payload = {
        "model": model,
        "prompt": prompt_text,
        "stream": False # We want the full response at once
    }
    try:
        response = requests.post(ollama_api_url, headers=headers, data=json.dumps(payload))
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        data = response.json()
        return data['response']
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to Ollama: {e}")
        return None
    except KeyError:
        print(f"Unexpected response format from Ollama: {data}")
        return None

@app.route('/assign_task_ai', methods=['POST'])
def assign_task_ai():
    data = request.get_json()
    task_title = data.get('task_title', '').lower()
    task_description = data.get('task_description', '').lower()
    task_id = data.get('task_id')

    if not task_title and not task_description and not task_id:
        return jsonify({"error": "Task details (title/description or task_id) are required for assignment."}), 400

    # --- Rule-Based Assignment Logic ---
    team_members = User.query.filter_by(role='teamMember').all()
    member_lookup = {member.username.lower(): member for member in team_members}

    matched_categories = []
    
    # Check Frontend Category Keywords
    frontend_keywords = ['ui', 'ux', 'react', 'css', 'frontend', 'design', 'interface']
    if any(keyword in task_title for keyword in frontend_keywords) or \
       any(keyword in task_description for keyword in frontend_keywords):
        matched_categories.append('frontend')
    
    # Check Backend Category Keywords
    backend_keywords = ['api', 'database', 'backend', 'flask', 'sql', 'server', 'auth']
    if any(keyword in task_title for keyword in backend_keywords) or \
       any(keyword in task_description for keyword in backend_keywords):
        matched_categories.append('backend')

    # Initialize variables for final assignment
    final_assigned_user = None
    final_reasoning = ""
    source_of_assignment = "" # To indicate if it was "Rule-Based" or "AI Suggestion"

    if len(matched_categories) == 1:
        # Only one clear category matched, apply the specific rule
        if 'frontend' in matched_categories and 'dana dagher' in member_lookup:
            final_assigned_user = member_lookup['dana dagher']
            final_reasoning = "Assigned based on frontend keywords in task and Dana's frontend specialization."
            source_of_assignment = "Rule-Based"
        elif 'backend' in matched_categories and 'zaynab baalbaki' in member_lookup:
            final_assigned_user = member_lookup['zaynab baalbaki']
            final_reasoning = "Assigned based on backend keywords in task and Zaynab's backend specialization."
            source_of_assignment = "Rule-Based"
        print(f"Rule-based assignment (single category): {final_assigned_user.username if final_assigned_user else 'None'}")
    else:
        # If no categories matched, or multiple categories matched (ambiguous), defer to AI
        print("Ambiguous or no rule matched, consulting AI...")
        source_of_assignment = "AI Suggestion"
        
        if not team_members:
            return jsonify({"error": "No team members found for AI assignment."}), 404

        member_info = []
        for member in team_members:
            member_info.append(
                f"Name: {member.username}\n"
                f"Skills: {member.skills}\n"
                f"Past Projects: {member.past_projects}"
            )

        # Construct the prompt for Mistral
        prompt = f"""
        You are a Smart Team Assistant designed to assign tasks to team members based on their skills and past projects.
        The task might involve multiple domains (e.g., both frontend and backend).
        Analyze the task and the team members' profiles carefully to find the single BEST suitable team member.

        Here is the task:
        Title: {task_title if task_title else 'N/A'}
        Description: {task_description if task_description else 'N/A'}

        Here are the available team members and their profiles:
        {'-'*20}
        """
        prompt += "\n".join(member_info)
        prompt += f"""
        {'-'*20}

        Based on the task description and the team members' profiles, identify the BEST suitable team member to assign this task to.
        Provide your reasoning briefly.

        Your output MUST be in the following JSON format:
        {{
            "assigned_member_name": "Name of the assigned team member",
            "reasoning": "Brief explanation of why this member was chosen."
        }}
        """

        ollama_response_str = get_ollama_response(prompt)

        if ollama_response_str is None:
            return jsonify({"error": "Failed to get response from AI model. Check Ollama server."}), 500

        try:
            json_start = ollama_response_str.find('{')
            json_end = ollama_response_str.rfind('}') + 1
            
            if json_start == -1 or json_end == -1 or json_start >= json_end:
                raise ValueError("Could not find valid JSON in AI response.")

            json_part = ollama_response_str[json_start:json_end]
            ai_suggestion = json.loads(json_part)

            assigned_member_name_ai = ai_suggestion.get("assigned_member_name")
            reasoning_ai = ai_suggestion.get("reasoning")

            if not assigned_member_name_ai:
                return jsonify({"error": "AI response missing 'assigned_member_name'."}), 500

            assigned_user_ai = User.query.filter_by(username=assigned_member_name_ai).first()

            if not assigned_user_ai:
                return jsonify({
                    "message": "AI suggested a member not found in database. Please check AI output or user names.",
                    "ai_suggestion": ai_suggestion
                }), 404
            
            final_assigned_user = assigned_user_ai
            final_reasoning = reasoning_ai # AI provides the full reasoning
            # The `source_of_assignment` already says "AI Suggestion"

        except json.JSONDecodeError as e:
            print(f"JSON Decode Error from Ollama response: {e}")
            print(f"Raw Ollama Response: {ollama_response_str}")
            return jsonify({"error": "AI response was not valid JSON.", "raw_response": ollama_response_str}), 500
        except ValueError as e:
            return jsonify({"error": f"AI response processing error: {str(e)}", "raw_response": ollama_response_str}), 500
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"An unexpected error occurred during AI assignment: {str(e)}"}), 500
    
    # --- Apply Assignment to Task (if task_id provided) ---
    if task_id and final_assigned_user:
        task = Task.query.get(task_id)
        if task:
            task.assigned_to_id = final_assigned_user.id
            # Prefix reasoning with source for clarity in UI
            task.assignment_explanation = f"{source_of_assignment}: {final_reasoning}"
            db.session.commit()
            return jsonify({
                "message": "Task assigned successfully (Hybrid system)",
                "task_id": task_id,
                "assigned_to": final_assigned_user.username,
                "assigned_to_id": final_assigned_user.id,
                "assignment_explanation": task.assignment_explanation # Send prefixed back
            })
        else:
            return jsonify({"error": "Task to update not found."}), 404
    elif final_assigned_user:
        # If no task_id, just return the suggestion
        return jsonify({
            "message": "Assignment suggestion from Hybrid system retrieved",
            "suggested_assignee": final_assigned_user.username,
            "suggested_assignee_id": final_assigned_user.id,
            "reasoning": f"{source_of_assignment}: {final_reasoning}" # Prefix reasoning for suggestion too
        }), 200
    else:
        return jsonify({"error": "No assignment could be determined by rules or AI."}), 500

@app.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    users_data = []
    for user in users:
        users_data.append({
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "skills": user.skills,           # Added
            "past_projects": user.past_projects # Added
        })
    return jsonify(users_data)

@app.route('/users', methods=['POST'])
def add_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'teamMember') # Default to 'teamMember' if not specified
    skills = data.get('skills', '')
    past_projects = data.get('past_projects', '')

    # Basic validation
    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    if role not in ['teamLead', 'teamMember']: # Ensure valid roles are set
        return jsonify({"error": "Invalid role specified. Must be 'teamLead' or 'teamMember'."}), 400

    # Check if username already exists
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists."}), 409 # 409 Conflict

    try:
        hashed_password = generate_password_hash(password)
        new_user = User(
            username=username,
            password=hashed_password,
            role=role,
            skills=skills,
            past_projects=past_projects
        )
        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            "message": "User registered successfully",
            "id": new_user.id,
            "username": new_user.username,
            "role": new_user.role,
            "skills": new_user.skills,
            "past_projects": new_user.past_projects
        }), 201 # 201 Created
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# --- Basic Route (Test Endpoint) ---
@app.route('/')
def home():
    return jsonify({"message": "Flask Backend is running!"})

if __name__ == '__main__':
    app.run(debug=True, port=5000) # Run on port 5000