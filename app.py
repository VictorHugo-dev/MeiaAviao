from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)

# Database setup
DB_NAME = "routes.db"

def init_db():
    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS routes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                origin TEXT NOT NULL,
                destination TEXT NOT NULL
            )
        ''')
        conn.commit()

init_db()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/suggest-route", methods=["POST"])
def suggest_route():
    data = request.get_json()
    name = data.get("name")
    origin = data.get("origin")
    destination = data.get("destination")

    if not all([name, origin, destination]):
        return jsonify({"error": "All fields are required"}), 400

    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO routes (name, origin, destination) VALUES (?, ?, ?)", (name, origin, destination))
        conn.commit()

    return jsonify({"message": "Route suggested successfully!"})

@app.route("/routes", methods=["GET"])
def get_routes():
    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name, origin, destination FROM routes")
        routes = cursor.fetchall()

    return jsonify([{"name": row[0], "origin": row[1], "destination": row[2]} for row in routes])

if __name__ == "__main__":
    app.run(debug=True)
