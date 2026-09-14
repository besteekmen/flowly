"""Request models preserve the camelCase JSON names in ../openapi.yaml."""

import re
from datetime import date
from typing import Annotated, Literal

from pydantic import (
    AfterValidator, BaseModel, BeforeValidator, ConfigDict, EmailStr, Field,
    TypeAdapter, AnyUrl, model_validator,
)


def normalize_email(value):
    return value.strip().lower() if isinstance(value, str) else value


def check_date(value: str) -> str:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Use YYYY-MM-DD")
    date.fromisoformat(value)
    return value


def check_uri(value: str) -> str:
    TypeAdapter(AnyUrl).validate_python(value)
    return value


Email = Annotated[EmailStr, BeforeValidator(normalize_email)]
NewPassword = Annotated[str, Field(min_length=6)]
NonEmpty = Annotated[str, Field(min_length=1)]
Title = Annotated[str, Field(min_length=1, pattern=r"\S")]
DueDate = Annotated[str, AfterValidator(check_date)]
AvatarUrl = Annotated[str, AfterValidator(check_uri)]
Priority = Literal["low", "medium", "high"]
TaskStatus = Literal["todo", "in_progress", "done"]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class SignUp(Input):
    name: str
    email: Email
    password: NewPassword


class SignIn(Input):
    email: Email
    password: NonEmpty


class GoogleSignIn(Input):
    idToken: NonEmpty


class PasswordResetRequest(Input):
    email: Email


class ResetPassword(Input):
    token: NonEmpty
    newPassword: NewPassword


class ChangePassword(Input):
    currentPassword: NonEmpty
    newPassword: NewPassword


class PartialInput(Input):
    """Omitted fields are allowed, but only contract-nullable fields accept null."""

    @model_validator(mode="before")
    @classmethod
    def reject_nonnullable_nulls(cls, value):
        if isinstance(value, dict):
            for key, item in value.items():
                if item is None and key not in {"dueDate", "avatarUrl"}:
                    raise ValueError(f"{key} cannot be null")
        return value


class UpdateProfile(PartialInput):
    name: str | None = None
    avatarUrl: AvatarUrl | None = None


class RenameBoard(Input):
    name: str


class CreateTask(Input):
    title: Title
    description: str
    dueDate: DueDate | None
    priority: Priority
    status: TaskStatus


class UpdateTask(PartialInput):
    title: Title | None = None
    description: str | None = None
    dueDate: DueDate | None = None
    priority: Priority | None = None
    status: TaskStatus | None = None


class MoveTask(Input):
    status: TaskStatus
    index: int
