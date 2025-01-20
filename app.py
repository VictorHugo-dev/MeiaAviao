from flask import Flask, render_template, request, jsonify
import sqlite3
from pyftpdlib.authorizers import DummyAuthorizer
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer
import threading

app = Flask(__name__)

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

    if not name or not origin or not destination:
        return jsonify({"error": "Todos os campos são obrigatórios"}), 400

    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO routes (name, origin, destination) VALUES (?, ?, ?)",
            (name, origin, destination)
        )
        conn.commit()

    return jsonify({"message": "Rota sugerida com sucesso!"}), 201

@app.route("/routes", methods=["GET"])
def get_routes():
    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, origin, destination FROM routes")
        rows = cursor.fetchall()

    routes = [{"id": row[0], "name": row[1], "origin": row[2], "destination": row[3]} for row in rows]
    return jsonify(routes)


def start_ftp_server():
    authorizer = DummyAuthorizer()
    authorizer.add_user("MeiaAviaoAdminUser", "XbdvCcpdJvVVPRUlHadw", ".", perm="elradfmwMT") 

    handler = FTPHandler
    handler.authorizer = authorizer

    server = FTPServer(("0.0.0.0", 21), handler)  
    server.serve_forever()

if __name__ == "__main__":

    ftp_thread = threading.Thread(target=start_ftp_server)
    ftp_thread.daemon = True
    ftp_thread.start()


    app.run(debug=True)
