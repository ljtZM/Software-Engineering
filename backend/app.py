from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mysqldb import MySQL
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# 配置 MySQL
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = '你的数据库密码'
app.config['MYSQL_DB'] = 'user_system'
app.config['JWT_SECRET_KEY'] = 'super-secret-key'

mysql = MySQL(app)

@app.route("/")
def home():
    return "Welcome to the User System API!"


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data['username']
    email = data['email']
    password = data['password']
    role = data['role']

    cursor = mysql.connection.cursor()
    cursor.execute("SELECT id FROM users WHERE username=%s OR email=%s", (username, email))
    if cursor.fetchone():
        return jsonify({"message": "用户名或邮箱已存在"}), 400

    pw_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    cursor.execute("INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s)", 
                   (username, email, pw_hash, role))
    mysql.connection.commit()
    return jsonify({"message": "注册成功"})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']

    cursor = mysql.connection.cursor()
    cursor.execute("SELECT id, password_hash, role FROM users WHERE username=%s", (username,))
    user = cursor.fetchone()
    if not user or not bcrypt.check_password_hash(user[1], password):
        return jsonify({"message": "用户名或密码错误"}), 401

    token = create_access_token(identity={"id": user[0], "role": user[2]})
    return jsonify(access_token=token)

if __name__ == "__main__":
    app.run(debug=True)
