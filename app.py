from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import sqlite3
import os
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_urlsafe(16)  # Generate a random secret key

DB_NAME = "routes.db"

# Inicialização do banco de dados
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

# Página inicial
@app.route("/")
def home():
    return render_template("index.html")

# Login do Admin
@app.route("/admin-login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        # Hardcoded credentials for testing
        if username == "MeiaAviaoAdminUser" and password == "XbdvCcpdJvVVPRUlHadw":
            session["admin"] = True
            return redirect(url_for("admin_panel"))
        else:
            return render_template("admin_login.html", error="Credenciais inválidas")
    
    return render_template("admin_login.html")

# Painel Admin
@app.route("/admin-panel")
def admin_panel():
    if not session.get("admin"):
        return redirect(url_for("admin_login"))
    
    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, origin, destination FROM routes")
        rows = cursor.fetchall()

    routes = [{"id": row[0], "name": row[1], "origin": row[2], "destination": row[3]} for row in rows]

    # Debug print to check fetched routes
    print("Fetched routes:", routes)

    return render_template("admin_panel.html", routes=routes)  # Render admin_panel.html with routes

# Suggest Route
@app.route("/suggest-route", methods=["POST"])
def suggest_route():
    name = request.json.get("name")
    origin = request.json.get("origin")
    destination = request.json.get("destination")

    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO routes (name, origin, destination) VALUES (?, ?, ?)", (name, origin, destination))
        conn.commit()

    return jsonify({"message": "Rota sugerida com sucesso!"}), 201

# Dashboard Admin
@app.route("/admin")
def admin_dashboard():
    if not session.get("admin"):
        return redirect(url_for("admin_login"))
    
    # Você pode adicionar lógica para buscar estatísticas ou dados
    stats = {"users": 120, "messages": 450, "active_sessions": 15}
    return render_template("admin.html", stats=stats)

# Deletar rota
@app.route("/delete-route/<int:route_id>", methods=["POST"])
def delete_route(route_id):
    if not session.get("admin"):
        return jsonify({"error": "Não autorizado"}), 403

    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM routes WHERE id = ?", (route_id,))
        conn.commit()

    return jsonify({"message": "Rota deletada com sucesso!"})

# Logout do Admin
@app.route("/admin-logout")
def admin_logout():
    session.pop("admin", None)
    return redirect(url_for("home"))

# New route for getting routes
@app.route("/routes")
def get_routes():
    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, origin, destination FROM routes")
        rows = cursor.fetchall()

    routes = [{"id": row[0], "name": row[1], "origin": row[2], "destination": row[3]} for row in rows]
    return jsonify(routes)

if __name__ == "__main__":
    app.run(debug=True)
