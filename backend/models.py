"""
TidyTime Database Models
"""
from datetime import date, datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class Family(UserMixin, db.Model):
    """A family account. Free tier: limited to 1 child or 3 tasks."""
    __tablename__ = 'families'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_paid = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    children = db.relationship('Child', backref='family', lazy=True, cascade='all, delete-orphan')
    chores = db.relationship('Chore', backref='family', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Child(db.Model):
    """A child in a family."""
    __tablename__ = 'children'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    pin = db.Column(db.String(10), nullable=True)  # Simple numeric PIN for child login
    avatar = db.Column(db.String(50), default='star')  # Emoji or icon choice
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    completions = db.relationship('ChoreCompletion', backref='child', lazy=True, cascade='all, delete-orphan')


class Chore(db.Model):
    """A chore template defined by the parent. Can be recurring daily."""
    __tablename__ = 'chores'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), default='')
    minute_value = db.Column(db.Integer, nullable=False, default=1)
    icon = db.Column(db.String(50), default='🧹')
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class ChoreCompletion(db.Model):
    """Record of a child completing a chore on a given day."""
    __tablename__ = 'chore_completions'

    id = db.Column(db.Integer, primary_key=True)
    child_id = db.Column(db.Integer, db.ForeignKey('children.id'), nullable=False)
    chore_id = db.Column(db.Integer, db.ForeignKey('chores.id'), nullable=False)
    completed_date = db.Column(db.Date, nullable=False, default=date.today)
    completed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    verified_by = db.Column(db.String(50), default='parent')  # 'parent' or 'nanny'
    minutes_awarded = db.Column(db.Integer, nullable=False, default=0)

    chore = db.relationship('Chore', lazy=True)


class ScreenTimeUsage(db.Model):
    """Tracks screen time used by a child."""
    __tablename__ = 'screen_time_usage'

    id = db.Column(db.Integer, primary_key=True)
    child_id = db.Column(db.Integer, db.ForeignKey('children.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    minutes_used = db.Column(db.Integer, default=0)

    child_rel = db.relationship('Child', lazy=True)


def init_db(app):
    """Initialize database and create tables."""
    db.init_app(app)
    with app.app_context():
        db.create_all()