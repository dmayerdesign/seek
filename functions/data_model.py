from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Teacher:
    id: str
    nickname: str
    email_address: str

@dataclass
class Class:
    id: str
    teacher_email: str
    name: str
    students: List['Student']

@dataclass
class Student:
    id: str
    nickname: str
    notes: str

@dataclass
class LessonPlan:
    id: str
    teacher_email: str
    title: str
    published: bool
    questions: List['LessonQuestion']


@dataclass
class LessonQuestion:
    id: str
    body_text: str
    field_of_study: str
    specific_topic: str
    media_content_ids: Optional[List[str]] = None
    additional_context: Optional[str] = None
    final_response_categories: Optional[List[str]] = None
    analysis: Optional['LessonQuestionAnalysis'] = None


@dataclass
class LessonQuestionAnalysis:
    additional_context_summarized: Optional[str] = None
    suggested_response_categories: Optional[List[str]] = None


@dataclass
class Lesson:
    id: str  # Not a UUID like the others, rather a shorter string for use as a link
    lesson_plan_id: str
    class_id: str
    student_names: List[str]
    teacher_name: str
    teacher_email: str
    responses_locked: bool
    student_names_started: Optional[List[str]]
    responses: Optional[List['LessonResponse']]

@dataclass
class LessonResponse:
    id: str
    student_id: str
    student_name: str
    lesson_question_id: str
    response_image_base64: Optional[str]
    response_text: Optional[str]
    response_as_text: Optional[str]
    analysis: Optional['LessonResponseAnalysis']


@dataclass
class LessonResponseAnalysis:
    id: str
    question_id: str
    response_category: str
    response_category_explanation: str
    response_category_alternatives: List[str]

@dataclass
class MediaContent:
    id: str  # This matches the filename like "/mediaContent/{id}/some-file.png"
    deleted: bool
