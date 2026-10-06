from datetime import datetime

from flask_login import UserMixin

from extensions import db


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(60), nullable=True)
    bio = db.Column(db.String(500), nullable=True)
    theme = db.Column(db.String(10), nullable=False, default="auto")  # auto|dark|light
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    ratings = db.relationship(
        "UserRating", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )
    watchlist_items = db.relationship(
        "WatchlistItem", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )
    reviews = db.relationship(
        "MovieReview", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )
    premium_membership = db.relationship(
        "PremiumMembership", backref="user", uselist=False,
        cascade="all, delete-orphan"
    )
    preference = db.relationship(
        "UserPreference", backref="user", uselist=False, cascade="all, delete-orphan"
    )
    notifications = db.relationship(
        "Notification", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )
    lists = db.relationship(
        "CustomList", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )

    @property
    def is_premium(self):
        return bool(self.premium_membership and self.premium_membership.active)

    @property
    def avatar_url(self):
        email_hash = (self.email or "").strip().lower()
        if not email_hash:
            return "/static/images/avatar-default.svg"
        import hashlib
        digest = hashlib.md5(email_hash.encode("utf-8")).hexdigest()
        return f"https://www.gravatar.com/avatar/{digest}?s=160&d=identicon"

    def to_public_dict(self):
        return {
            "username": self.username,
            "display_name": self.display_name or self.username,
            "bio": self.bio,
            "avatar_url": self.avatar_url,
            "created_at": self.created_at,
        }

    def __repr__(self):
        return f"<User {self.username}>"


class UserPreference(db.Model):
    __tablename__ = "user_preferences"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True, index=True)
    favorite_genres = db.Column(db.JSON, default=list)       # list of genre ids
    favorite_languages = db.Column(db.JSON, default=list)    # list of language codes
    disliked_genres = db.Column(db.JSON, default=list)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ViewHistory(db.Model):
    __tablename__ = "view_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    tmdb_id = db.Column(db.Integer, nullable=False)
    media_type = db.Column(db.String(10), nullable=False)
    viewed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    time_spent_seconds = db.Column(db.Integer, nullable=False, default=0)

    __table_args__ = (
        db.Index("idx_view_history_user_title", "user_id", "tmdb_id", "media_type"),
    )


class UserRating(db.Model):
    __tablename__ = "user_ratings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    tmdb_id = db.Column(db.Integer, nullable=False)
    media_type = db.Column(db.String(10), nullable=False)   # "movie" or "tv"
    rating = db.Column(db.Float, nullable=False)            # 0.5 - 5.0
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "tmdb_id", "media_type", name="uq_user_rating"),
        db.Index("idx_user_ratings", "user_id", "tmdb_id", "media_type"),
    )

    def __repr__(self):
        return f"<UserRating user={self.user_id} tmdb_id={self.tmdb_id} rating={self.rating}>"


class WatchlistItem(db.Model):
    __tablename__ = "watchlist_items"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    tmdb_id = db.Column(db.Integer, nullable=False)
    media_type = db.Column(db.String(10), nullable=False)
    watched = db.Column(db.Boolean, nullable=False, default=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "tmdb_id", "media_type", name="uq_watchlist_item"),
        db.Index("idx_watchlist_user", "user_id"),
    )

    def __repr__(self):
        return f"<WatchlistItem user={self.user_id} tmdb_id={self.tmdb_id}>"


class TitleLike(db.Model):
    __tablename__ = "title_likes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    tmdb_id = db.Column(db.Integer, nullable=False)
    media_type = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "tmdb_id", "media_type", name="uq_title_like"),
    )


class MovieReview(db.Model):
    __tablename__ = "movie_reviews"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    tmdb_id = db.Column(db.Integer, nullable=False)
    media_type = db.Column(db.String(10), nullable=False)
    experience = db.Column(db.Text, nullable=False)
    spoiler = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    votes = db.relationship("ReviewVote", backref="review", lazy="dynamic", cascade="all, delete-orphan")

    __table_args__ = (
        db.UniqueConstraint("user_id", "tmdb_id", "media_type", name="uq_user_review"),
        db.Index("idx_review_title", "tmdb_id", "media_type"),
    )


class ReviewVote(db.Model):
    __tablename__ = "review_votes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    review_id = db.Column(db.Integer, db.ForeignKey("movie_reviews.id"), nullable=False, index=True)
    value = db.Column(db.Integer, nullable=False, default=1)  # 1 helpful, -1 not helpful

    __table_args__ = (
        db.UniqueConstraint("user_id", "review_id", name="uq_review_vote"),
    )


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False)  # review_helpful, new_release, ...
    message = db.Column(db.String(500), nullable=False)
    link = db.Column(db.String(200), nullable=True)
    read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (db.Index("idx_notification_user_read", "user_id", "read"),)


class CustomList(db.Model):
    __tablename__ = "custom_lists"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(80), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    is_public = db.Column(db.Boolean, nullable=False, default=True)
    is_official = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    items = db.relationship(
        "ListItem", backref="list", lazy="dynamic",
        cascade="all, delete-orphan", order_by="ListItem.position"
    )


class ListItem(db.Model):
    __tablename__ = "list_items"

    id = db.Column(db.Integer, primary_key=True)
    list_id = db.Column(db.Integer, db.ForeignKey("custom_lists.id"), nullable=False, index=True)
    tmdb_id = db.Column(db.Integer, nullable=False)
    media_type = db.Column(db.String(10), nullable=False)
    position = db.Column(db.Integer, nullable=False, default=0)
    added_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("list_id", "tmdb_id", "media_type", name="uq_list_item"),
    )


class Follow(db.Model):
    __tablename__ = "follows"

    id = db.Column(db.Integer, primary_key=True)
    follower_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    followed_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("follower_id", "followed_id", name="uq_follow"),
    )


class PremiumMembership(db.Model):
    __tablename__ = "premium_memberships"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True, index=True)
    active = db.Column(db.Boolean, nullable=False, default=True)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)