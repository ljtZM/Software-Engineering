from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from services.db_utils import get_db
import pymysql


auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.json
    print("收到的数据：", data)  # 👈 关键排查点
    username = data.get('username')
    email = data.get('email')
    password_plain = data.get('password')
    role = data.get('role', '普通用户')  # 默认普通用户
    print('注册时收到的role:', role)

    if not username or not email or not password_plain:
        return jsonify({'message': '用户名、邮箱和密码不能为空'}), 400

    password_hash = generate_password_hash(password_plain)

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s)",
                (username, email, password_hash, role)
            )
        conn.commit()
        return jsonify({'message': '注册成功'}), 200
    except pymysql.err.IntegrityError:
        return jsonify({'message': '用户名或邮箱已存在'}), 400
    finally:
        conn.close()

@auth_bp.route('/api/login', methods=['POST'])
def login():
    print("调用登录函数")
    data = request.json
    login_id = data.get('username') or data.get('email')  # 支持用用户名或邮箱登录
    password = data.get('password')
    role = data.get('role')  # 添加角色字段提取

    if not login_id or not password or not role:
        return jsonify({'message': '用户名/邮箱、密码和角色不能为空'}), 400

    conn = get_db()

    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:  # ✅ 记得用 DictCursor
            cursor.execute(
                "SELECT * FROM users WHERE (username=%s OR email=%s) AND role=%s",
                (login_id, login_id, role)
            )
            user = cursor.fetchone()

            if user and check_password_hash(user['password_hash'], password):
                access_token = create_access_token(identity=str(user['id']))
                return jsonify({
                    'message': '登录成功',
                    'token': access_token,
                    'user': {
                        'username': user['username'],
                        'email': user['email'],
                        'role': user['role']
                    }
                }), 200
            else:
                return jsonify({'message': '用户名、密码或权限错误'}), 401
    finally:
        conn.close()
