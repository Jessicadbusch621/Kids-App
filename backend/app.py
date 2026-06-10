"""
TidyTime — Main Flask Application
"""
import os
import sys
from datetime import date, timedelta

from flask import Flask, jsonify, request, send_from_directory
from flask_login import (
    LoginManager,
    login_user,
    logout_user,
    login_required,
    current_user,
)
from flask_cors import CORS

# Add parent directory to path so we can import models
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import db, Family, Child, Chore, ChoreCompletion, ScreenTimeUsage, init_db

app = Flask(__name__, static_folder=None)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'tidytime-dev-secret-change-in-prod')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 'tidytime.db'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

CORS(app, supports_credentials=True)
init_db(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'api_login'


# ─── Frontend Static Files ──────────────────────────────────────────
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'dist')


@login_manager.user_loader
def load_user(family_id):
    return db.session.get(Family, int(family_id))


# ─── Helper Functions ────────────────────────────────────────────────

def get_today():
    return date.today()


def family_is_within_free_tier(family):
    """Check if family is within free tier limits (1 child OR 3 chores max)."""
    if family.is_paid:
        return True
    child_count = Child.query.filter_by(family_id=family.id).count()
    chore_count = Chore.query.filter_by(family_id=family.id).count()
    return child_count <= 1 or chore_count <= 3


def free_tier_error():
    return jsonify({'error': 'Free tier limit reached. Upgrade to add more children or chores.'}), 403


# ─── Auth Routes ─────────────────────────────────────────────────────

@app.route('/api/auth/signup', methods=['POST'])
def api_signup():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'error': 'Name, email, and password required'}), 400

    if Family.query.filter_by(email=data['email'].strip().lower()).first():
        return jsonify({'error': 'Email already registered'}), 409

    family = Family(
        name=data['name'].strip(),
        email=data['email'].strip().lower(),
        is_paid=False
    )
    family.set_password(data['password'])
    db.session.add(family)
    db.session.commit()

    login_user(family)
    return jsonify({
        'user': {'id': family.id, 'name': family.name, 'email': family.email, 'is_paid': family.is_paid}
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400

    family = Family.query.filter_by(email=data['email'].strip().lower()).first()
    if not family or not family.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401

    login_user(family)
    return jsonify({
        'user': {'id': family.id, 'name': family.name, 'email': family.email, 'is_paid': family.is_paid}
    })


@app.route('/api/auth/logout', methods=['POST'])
@login_required
def api_logout():
    logout_user()
    return jsonify({'message': 'Logged out'})


@app.route('/api/auth/me', methods=['GET'])
@login_required
def api_me():
    return jsonify({
        'user': {
            'id': current_user.id,
            'name': current_user.name,
            'email': current_user.email,
            'is_paid': current_user.is_paid
        }
    })


# ─── Children Management ─────────────────────────────────────────────

@app.route('/api/children', methods=['GET'])
@login_required
def api_get_children():
    children = Child.query.filter_by(family_id=current_user.id).all()
    return jsonify({
        'children': [{'id': c.id, 'name': c.name, 'pin': c.pin, 'avatar': c.avatar} for c in children]
    })


@app.route('/api/children', methods=['POST'])
@login_required
def api_add_child():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'Child name required'}), 400

    if not family_is_within_free_tier(current_user):
        return free_tier_error()

    child = Child(
        name=data['name'].strip(),
        pin=data.get('pin', ''),
        avatar=data.get('avatar', 'star'),
        family_id=current_user.id
    )
    db.session.add(child)
    db.session.commit()
    return jsonify({'child': {'id': child.id, 'name': child.name, 'pin': child.pin, 'avatar': child.avatar}}), 201


@app.route('/api/children/<int:child_id>', methods=['PUT'])
@login_required
def api_update_child(child_id):
    child = Child.query.filter_by(id=child_id, family_id=current_user.id).first_or_404()
    data = request.get_json()
    if data.get('name'):
        child.name = data['name'].strip()
    if 'pin' in data:
        child.pin = data['pin']
    if 'avatar' in data:
        child.avatar = data['avatar']
    db.session.commit()
    return jsonify({'child': {'id': child.id, 'name': child.name, 'pin': child.pin, 'avatar': child.avatar}})


@app.route('/api/children/<int:child_id>', methods=['DELETE'])
@login_required
def api_delete_child(child_id):
    child = Child.query.filter_by(id=child_id, family_id=current_user.id).first_or_404()
    db.session.delete(child)
    db.session.commit()
    return jsonify({'message': 'Child deleted'})


# ─── Chore Management ────────────────────────────────────────────────

@app.route('/api/chores', methods=['GET'])
@login_required
def api_get_chores():
    chores = Chore.query.filter_by(family_id=current_user.id).all()
    return jsonify({
        'chores': [{'id': c.id, 'name': c.name, 'description': c.description,
                     'minute_value': c.minute_value, 'icon': c.icon} for c in chores]
    })


@app.route('/api/chores', methods=['POST'])
@login_required
def api_add_chore():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'Chore name required'}), 400
    if data.get('minute_value', 1) < 1:
        return jsonify({'error': 'Minute value must be at least 1'}), 400

    if not family_is_within_free_tier(current_user):
        return free_tier_error()

    chore = Chore(
        name=data['name'].strip(),
        description=data.get('description', ''),
        minute_value=data['minute_value'],
        icon=data.get('icon', '🧹'),
        family_id=current_user.id
    )
    db.session.add(chore)
    db.session.commit()
    return jsonify({
        'chore': {'id': chore.id, 'name': chore.name, 'description': chore.description,
                   'minute_value': chore.minute_value, 'icon': chore.icon}
    }), 201


@app.route('/api/chores/<int:chore_id>', methods=['PUT'])
@login_required
def api_update_chore(chore_id):
    chore = Chore.query.filter_by(id=chore_id, family_id=current_user.id).first_or_404()
    data = request.get_json()
    if data.get('name'):
        chore.name = data['name'].strip()
    if 'description' in data:
        chore.description = data['description']
    if 'minute_value' in data:
        chore.minute_value = data['minute_value']
    if 'icon' in data:
        chore.icon = data['icon']
    db.session.commit()
    return jsonify({
        'chore': {'id': chore.id, 'name': chore.name, 'description': chore.description,
                   'minute_value': chore.minute_value, 'icon': chore.icon}
    })


@app.route('/api/chores/<int:chore_id>', methods=['DELETE'])
@login_required
def api_delete_chore(chore_id):
    chore = Chore.query.filter_by(id=chore_id, family_id=current_user.id).first_or_404()
    db.session.delete(chore)
    db.session.commit()
    return jsonify({'message': 'Chore deleted'})


# ─── Daily Chore List & Completion ───────────────────────────────────

def _can_add_more_chores_today(family_id, child_id):
    """Check if family is within free tier task limit for the day."""
    family = db.session.get(Family, family_id)
    if family and family.is_paid:
        return True
    # Free tier: max 3 completions per child per day? Actually free tier means
    # "1 child OR 3 tasks max" — let's interpret as: the family can only have
    # 3 chore templates total. That's already handled in api_add_chore.
    # No additional per-day limit needed on completions.
    return True


@app.route('/api/children/<int:child_id>/today', methods=['GET'])
@login_required
def api_get_child_today(child_id):
    child = Child.query.filter_by(id=child_id, family_id=current_user.id).first_or_404()
    today = get_today()

    # All family chores
    chores = Chore.query.filter_by(family_id=current_user.id).all()

    # Already completed today
    completed = ChoreCompletion.query.filter_by(
        child_id=child_id, completed_date=today
    ).all()
    completed_chore_ids = {c.chore_id for c in completed}

    # Total earned today
    today_minutes = sum(c.minutes_awarded for c in completed)

    # Total earned all time
    all_completions = ChoreCompletion.query.filter_by(child_id=child_id).all()
    total_minutes = sum(c.minutes_awarded for c in all_completions)

    # Minutes used today
    usage = ScreenTimeUsage.query.filter_by(child_id=child_id, date=today).first()
    minutes_used = usage.minutes_used if usage else 0

    # Available balance
    balance = total_minutes - ScreenTimeUsage.query.with_entities(
        db.func.coalesce(db.func.sum(ScreenTimeUsage.minutes_used), 0)
    ).filter_by(child_id=child_id).scalar()

    return jsonify({
        'child': {'id': child.id, 'name': child.name, 'avatar': child.avatar},
        'chores': [{'id': c.id, 'name': c.name, 'description': c.description,
                     'minute_value': c.minute_value, 'icon': c.icon,
                     'completed': c.id in completed_chore_ids}
                    for c in chores],
        'today_earned': today_minutes,
        'total_earned': total_minutes,
        'minutes_used_today': minutes_used,
        'balance': balance
    })


@app.route('/api/children/<int:child_id>/complete/<int:chore_id>', methods=['POST'])
@login_required
def api_complete_chore(child_id, chore_id):
    child = Child.query.filter_by(id=child_id, family_id=current_user.id).first_or_404()
    chore = Chore.query.filter_by(id=chore_id, family_id=current_user.id).first_or_404()
    today = get_today()

    # Check if already completed today
    existing = ChoreCompletion.query.filter_by(
        child_id=child_id, chore_id=chore_id, completed_date=today
    ).first()
    if existing:
        return jsonify({'error': 'Chore already completed today'}), 409

    completion = ChoreCompletion(
        child_id=child_id,
        chore_id=chore_id,
        completed_date=today,
        minutes_awarded=chore.minute_value,
        verified_by='parent'
    )
    db.session.add(completion)
    db.session.commit()

    return jsonify({
        'completion': {
            'id': completion.id,
            'chore_name': chore.name,
            'minutes_awarded': completion.minutes_awarded
        }
    }), 201


@app.route('/api/children/<int:child_id>/uncomplete/<int:chore_id>', methods=['DELETE'])
@login_required
def api_uncomplete_chore(child_id, chore_id):
    child = Child.query.filter_by(id=child_id, family_id=current_user.id).first_or_404()
    today = get_today()

    completion = ChoreCompletion.query.filter_by(
        child_id=child_id, chore_id=chore_id, completed_date=today
    ).first()
    if not completion:
        return jsonify({'error': 'Completion not found'}), 404

    db.session.delete(completion)
    db.session.commit()
    return jsonify({'message': 'Chore unmarked'})


# ─── Screen Time Usage ───────────────────────────────────────────────

@app.route('/api/children/<int:child_id>/use-time', methods=['POST'])
@login_required
def api_use_time(child_id):
    child = Child.query.filter_by(id=child_id, family_id=current_user.id).first_or_404()
    data = request.get_json()
    minutes = data.get('minutes', 0)
    if minutes <= 0:
        return jsonify({'error': 'Minutes must be positive'}), 400

    today = get_today()
    usage = ScreenTimeUsage.query.filter_by(child_id=child_id, date=today).first()
    if not usage:
        usage = ScreenTimeUsage(child_id=child_id, date=today, minutes_used=0)
        db.session.add(usage)

    usage.minutes_used += minutes
    db.session.commit()

    return jsonify({'minutes_used_today': usage.minutes_used})


@app.route('/api/children/<int:child_id>/usage', methods=['GET'])
@login_required
def api_get_usage(child_id):
    child = Child.query.filter_by(id=child_id, family_id=current_user.id).first_or_404()
    today = get_today()

    usage = ScreenTimeUsage.query.filter_by(child_id=child_id, date=today).first()
    minutes_used = usage.minutes_used if usage else 0

    # Balance check
    all_completions = ChoreCompletion.query.filter_by(child_id=child_id).all()
    total_earned = sum(c.minutes_awarded for c in all_completions)
    total_used = ScreenTimeUsage.query.with_entities(
        db.func.coalesce(db.func.sum(ScreenTimeUsage.minutes_used), 0)
    ).filter_by(child_id=child_id).scalar()
    balance = total_earned - total_used

    return jsonify({
        'total_earned': total_earned,
        'total_used': total_used,
        'balance': balance,
        'minutes_used_today': minutes_used
    })


# ─── Subscription / Upgrade ──────────────────────────────────────────

@app.route('/api/upgrade', methods=['POST'])
@login_required
def api_upgrade():
    """Stub: sets is_paid = True. In production, integrate Stripe."""
    current_user.is_paid = True
    db.session.commit()
    return jsonify({'message': 'Account upgraded!', 'is_paid': True})


# ─── Child-Facing Auth (PIN-based login) ─────────────────────────────

@app.route('/api/child/login', methods=['POST'])
def api_child_login():
    """Simple PIN-based login for kids. Returns a token for child view."""
    data = request.get_json()
    if not data or not data.get('child_id') or not data.get('pin'):
        return jsonify({'error': 'Child ID and PIN required'}), 400

    child = db.session.get(Child, int(data['child_id']))
    if not child or child.pin != data['pin'].strip():
        return jsonify({'error': 'Invalid child ID or PIN'}), 401

    return jsonify({
        'child': {'id': child.id, 'name': child.name, 'avatar': child.avatar}
    })


@app.route('/api/child/<int:child_id>/view', methods=['GET'])
def api_child_view(child_id):
    """Public endpoint for the kid's daily view (no auth needed for MVP —
    protected by child having a simple PIN for their actual login)."""
    child = db.session.get(Child, child_id)
    if not child:
        return jsonify({'error': 'Child not found'}), 404

    today = get_today()
    chores = Chore.query.filter_by(family_id=child.family_id).all()

    completed = ChoreCompletion.query.filter_by(
        child_id=child_id, completed_date=today
    ).all()
    completed_chore_ids = {c.chore_id for c in completed}

    today_earned = sum(c.minutes_awarded for c in completed)

    all_completions = ChoreCompletion.query.filter_by(child_id=child_id).all()
    total_earned = sum(c.minutes_awarded for c in all_completions)

    usage = ScreenTimeUsage.query.filter_by(child_id=child_id, date=today).first()
    minutes_used = usage.minutes_used if usage else 0

    total_used = ScreenTimeUsage.query.with_entities(
        db.func.coalesce(db.func.sum(ScreenTimeUsage.minutes_used), 0)
    ).filter_by(child_id=child_id).scalar()
    balance = total_earned - total_used

    return jsonify({
        'child': {'id': child.id, 'name': child.name, 'avatar': child.avatar},
        'chores': [{'id': c.id, 'name': c.name, 'description': c.description,
                     'minute_value': c.minute_value, 'icon': c.icon,
                     'completed': c.id in completed_chore_ids}
                    for c in chores],
        'today_earned': today_earned,
        'total_earned': total_earned,
        'minutes_used_today': minutes_used,
        'balance': balance
    })


# ─── Serve Frontend ──────────────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve the built React frontend from dist/."""
    if path and os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    index_path = os.path.join(FRONTEND_DIST, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return jsonify({'message': 'TidyTime API is running. Build the frontend with: cd frontend && npm install && npm run build'}), 200


# ─── Main ────────────────────────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    host = os.environ.get('HOST', '0.0.0.0')
    print(f"🚀 TidyTime server starting on {host}:{port}")
    app.run(host=host, port=port, debug=True)