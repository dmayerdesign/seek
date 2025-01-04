from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class Teacher:
    id: str
    user_id: str
    nickname: str
    email_address: str
    created_at: str
    updated_at: str

@dataclass
class TeacherData(Teacher):
    classes: List['Class'] = None
    lesson_plans: List['LessonPlan'] = None
    lessons: List['Lesson'] = None

@dataclass
class Class:
    id: str
    teacher_email: str
    name: str
    created_at: str
    updated_at: str
    students: Optional[List['Student']] = None

@dataclass
class Student:
    id: str
    class_id: str
    teacher_email: str
    nickname: str
    notes: str
    created_at: str
    updated_at: str

@dataclass
class LessonPlan:
    id: str
    teacher_email: str
    title: str
    published: bool
    created_at: str
    updated_at: str
    questions: Optional[List['LessonQuestion']] = None


@dataclass
class LessonQuestion:
    id: str
    lesson_plan_id: str
    teacher_email: str
    body_text: str
    # field_of_study: str
    # specific_topic: str
    created_at: str
    updated_at: str
    categorization_guidance: Optional[str] = None
    media_content_urls: Optional[List[str]] = None
    context_material_urls: Optional[List[str]] = None



@dataclass
class Lesson:
    id: str  # Not a UUID like the others, rather a shorter string for use as a link
    lesson_name: str
    lesson_plan_id: str
    lesson_plan_name: str
    class_id: str
    class_name: str
    teacher_name: str
    teacher_email: str
    responses_locked: bool
    created_at: str
    updated_at: str
    deleted: Optional[bool] = None
    student_names_started: Optional[List[str]] = None
    class_data: Optional['Class'] = None
    lesson_plan: Optional['LessonPlan'] = None
    responses: Optional[List['LessonResponse']] = None
    analysis_by_question_id: Optional[Dict[str, 'LessonQuestionAnalysis']] = None


@dataclass
class LessonQuestionAnalysis:
    question_id: str
    responses_by_category: Dict[str, List['LessonResponse']]


@dataclass
class LessonResponse:
    id: str
    teacher_email: str
    question_id: str
    lesson_id: str
    student_id: str
    student_name: str
    created_at: str
    updated_at: str
    response_image_base64: Optional[str] = None
    response_text: Optional[str] = None
    analysis: Optional['LessonResponseAnalysis'] = None


@dataclass
class LessonResponseAnalysis:
    response_summary: str
