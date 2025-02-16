from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from flask_wtf.csrf import CSRFProtect, generate_csrf
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os
from functools import wraps
from contextlib import closing

app = Flask(__name__)
app.secret_key = 'vaDERATEInGsTRaTIPSTYpHOlerTRAVAlIgArisIVernentEnT'
csrf = CSRFProtect(app)

DATABASE_NAME = 'routes.db'

class Route:
    def __init__(self, route_id, name, origin, destination):
        self.id = route_id
        self.name = name
        self.origin = origin.upper()
        self.destination = destination.upper()

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'origin': self.origin,
            'destination': self.destination
        }

def get_db():
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with closing(get_db()) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS routes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                origin TEXT NOT NULL CHECK(length(origin) = 4),
                destination TEXT NOT NULL CHECK(length(destination) = 4)
            )
        ''')
        conn.commit()

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin'):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated

@app.route('/')
def home():
    return render_template('index.html')

@app.after_request
def set_csrf_cookie(response):
    if response.status_code == 200:
        response.set_cookie('csrf_token', generate_csrf())
    return response

@app.route('/routes')
def list_routes():
    try:
        with get_db() as conn:
            routes = conn.execute('''
                SELECT id, name, origin, destination
                FROM routes
                ORDER BY id DESC
            ''').fetchall()
            return jsonify([dict(route) for route in routes])
    except sqlite3.Error as e:
        app.logger.error(f'Database error: {str(e)}')
        return jsonify({'error': 'Erro ao buscar rotas'}), 500

@app.route('/suggest-route', methods=['POST'])
def suggest_route():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Nenhum dado foi enviado'}), 400

        required_fields = ['name', 'origin', 'destination']
        if not all(field in data and isinstance(data[field], str) for field in required_fields):
            return jsonify({'error': 'Todos os campos são obrigatórios e devem ser strings'}), 400

        origin = data['origin'].strip().upper()
        destination = data['destination'].strip().upper()
        
        if len(origin) != 4 or not origin.isalpha():
            return jsonify({'error': 'Código ICAO de origem inválido'}), 400
            
        if len(destination) != 4 or not destination.isalpha():
            return jsonify({'error': 'Código ICAO de destino inválido'}), 400

        with get_db() as conn:
            cursor = conn.execute('''
                INSERT INTO routes (name, origin, destination)
                VALUES (?, ?, ?)
            ''', (data['name'].strip(), origin, destination))
            
            conn.commit()
            
            new_route = Route(cursor.lastrowid, data['name'].strip(), origin, destination)
            
            return jsonify({
                'message': 'Rota cadastrada com sucesso',
                'route': new_route.to_dict()
            }), 201
            
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Erro de integridade nos dados'}), 400
    except Exception as e:
        app.logger.error(f'Erro: {str(e)}')
        return jsonify({'error': 'Erro interno no servidor'}), 500

@app.route('/admin-login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        with get_db() as conn:
            admin_user = conn.execute(
                'SELECT password_hash FROM admin WHERE username = ?',
                (username,)
            ).fetchone()
        
        if admin_user and check_password_hash(admin_user['password_hash'], password):
            session['admin'] = True
            return redirect(url_for('admin_panel'))
        return render_template('admin_login.html', error='Credenciais inválidas')
    
    return render_template('admin_login.html')

@app.route('/admin-panel')
@admin_required
def admin_panel():
    try:
        with get_db() as conn:
            routes = conn.execute('''
                SELECT id, name, origin, destination
                FROM routes
                ORDER BY id DESC
            ''').fetchall()
            
            return render_template('admin_panel.html', routes=routes)
    except sqlite3.Error as e:
        return render_template('admin_panel.html', error='Erro ao carregar rotas')

@app.route('/delete-route/<int:route_id>', methods=['POST'])
@admin_required
def delete_route(route_id):
    try:
        with get_db() as conn:
            result = conn.execute('DELETE FROM routes WHERE id = ?', (route_id,))
            conn.commit()
            if result.rowcount == 0:
                return jsonify({'error': 'Rota não encontrada'}), 404
            return jsonify({'message': 'Rota removida com sucesso'}), 200
    except sqlite3.Error as e:
        return jsonify({'error': 'Erro ao excluir rota'}), 500

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static'),
        'favicon.ico',
        mimetype='image/vnd.microsoft.icon'
    )

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=8000, debug=False)
