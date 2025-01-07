# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
import base64
import dataclasses
import json
from textwrap import dedent
from typing import Any, Dict, List
from firebase_functions import https_fn, options
from firebase_functions.params import StringParam
from google.cloud.firestore_v1 import FieldFilter, DocumentReference, CollectionReference, DocumentSnapshot
# The Firebase Admin SDK to access Cloud Firestore.
from firebase_admin import initialize_app, firestore, auth, storage
import asyncio
from anthropic import Anthropic
import requests
from data_model import Lesson, LessonPlan, LessonQuestion, LessonQuestionAnalysis, LessonResponse, Student, Teacher, Class, TeacherData
# from functions import data_model

# OPENAI_API_KEY = StringParam("OPENAI_API_KEY")
ANTHROPIC_API_KEY = StringParam("ANTHROPIC_API_KEY")

app = initialize_app()
db = firestore.client(app)
bucket = storage.bucket(app=app)


######### Queries

@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def getTeacherData(request: https_fn.CallableRequest):
    if request.auth is None:
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.UNAUTHENTICATED, message="login required")

    # Look up the teacher
    user: auth.UserRecord = auth.get_user(request.auth.uid)
    if user is not None and user.email is not None:
        teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', user.email)).stream())
        print("teacher matches", len(teacherMatches))
        if len(teacherMatches) == 1:
            teacher = TeacherData(**teacherMatches[0].to_dict())
            if teacher is None or teacher.id is None:
                raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.NOT_FOUND, message="not found")
            teacher_id = teacher.id
            teacher_ref = db.collection('teachers').document(teacher_id)

            # Look up their classes
            classes_coll: CollectionReference = teacher_ref.collection('classes')
            class_docs = list(classes_coll.stream())
            teacher.classes = []
            if len(class_docs) > 0:
                teacher.classes = [Class(**class_docs[i].to_dict()) for i in range(len(class_docs))]
                teacher.classes.sort(key=lambda c: c.created_at)
                for cls in teacher.classes:
                    students_ref: CollectionReference = classes_coll.document(cls.id).collection('students')
                    students = list(students_ref.stream())
                    cls.students = students
                    if len(students) > 0:
                        cls.students = [Student(**students[i].to_dict()) for i in range(len(students))]
                        # Sort students by name
                        cls.students.sort(key=lambda student: student.created_at)

            # Look up their lesson plans
            lesson_plans_coll: CollectionReference = teacher_ref.collection('lesson_plans')
            lesson_plan_docs = list(lesson_plans_coll.stream())
            teacher.lesson_plans = []
            if len(lesson_plan_docs) > 0:
                teacher.lesson_plans = [LessonPlan(**lesson_plan_docs[i].to_dict()) for i in range(len(lesson_plan_docs))]
                for plan in teacher.lesson_plans:
                    questions_coll: CollectionReference = lesson_plans_coll.document(plan.id).collection('questions')
                    questions = list(questions_coll.stream())
                    if len(questions) > 0:
                        # for i in range(len(questions)):
                        #     print(questions[i].to_dict())
                        plan.questions = [LessonQuestion(**questions[i].to_dict()) for i in range(len(questions))]
                        # Sort by created_at
                        plan.questions.sort(key=lambda question: question.created_at)

            # Look up their lessons
            lessons_coll: CollectionReference = teacher_ref.collection('lessons')
            lesson_docs = list(lessons_coll.where(filter=FieldFilter('deleted', '!=', True)).stream())
            teacher.lessons = []
            if len(lesson_docs) > 0:
                teacher.lessons = [Lesson(**lesson_docs[i].to_dict()) for i in range(len(lesson_docs))]
                for lesson in teacher.lessons:
                    responses_coll: CollectionReference = lessons_coll.document(lesson.id).collection('responses')
                    responses = list(responses_coll.stream())
                    if len(responses) > 0:
                        lesson.responses = [LessonResponse(**responses[i].to_dict()) for i in range(len(responses))]
                        # Sort by created_at
                        lesson.responses.sort(key=lambda response: response.created_at)

            return teacher

    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.NOT_FOUND, message="not found")


@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def getLessonPlans(request: https_fn.CallableRequest):
    teacher: TeacherData = None
    if request.auth is not None:
        user: auth.UserRecord = auth.get_user(request.auth.uid)
        if user is not None and user.email is not None:
            teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', user.email)).stream())
            if len(teacherMatches) == 1:
                teacher = TeacherData(**teacherMatches[0].to_dict())
    if teacher is not None and teacher.id is not None:
        return _getLessonPlans(teacher, True)
    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


def _getLessonPlans(
    teacher: TeacherData,
    include_questions: bool = False,
    lesson_plan_id: str = None,
) -> List[Lesson]:
    teacher_ref = db.collection('teachers').document(teacher.id)

    lesson_plans_coll: CollectionReference = teacher_ref.collection('lesson_plans')
    lesson_plan_docs: List[DocumentSnapshot] = []
    if lesson_plan_id is not None:
        lesson_plan_docs = [lesson_plans_coll.document(lesson_plan_id).get()]
    else:
        lesson_plan_docs = list(lesson_plans_coll.stream())
    if len(lesson_plan_docs) > 0:
        teacher.lesson_plans = [LessonPlan(**lesson_plan_docs[i].to_dict()) for i in range(len(lesson_plan_docs))]

        # Join questions if requested
        if include_questions:
            for plan in teacher.lesson_plans:
                questions_coll: CollectionReference = lesson_plans_coll.document(plan.id).collection('questions')
                question_docs = list(questions_coll.stream())
                if len(question_docs) > 0:
                    plan.questions = [
                        LessonQuestion(
                            **question_docs[i].to_dict()) for i in range(len(question_docs)
                        )
                    ]
                    # Sort by created_at
                    plan.questions.sort(key=lambda question: question.created_at)

        return teacher.lesson_plans


# Meant to be called by the teacher
@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def getLessons(request: https_fn.CallableRequest):
    if request.auth is not None:
        user: auth.UserRecord = auth.get_user(request.auth.uid)
        if user is not None and user.email is not None:
            teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', user.email)).stream())
            if len(teacherMatches) == 1:
                teacher = TeacherData(**teacherMatches[0].to_dict())
                return _getLessons(teacher, True)
    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


def _getLessons(
    teacher: TeacherData,
    include_responses: bool = False,
    lesson_id: str = None,
) -> List[Lesson]:
    if teacher is not None and teacher.id is not None:
        # Look up their lesson plans
        teacher_ref = db.collection('teachers').document(teacher.id)
        lessons_coll: CollectionReference = teacher_ref.collection('lessons')
        lessons_data: Dict[str, Any] = []

        if lesson_id is not None:
            lessons_data = [
                lessons_coll.document(lesson_id).get()
            ]
        else:
            lessons_data = list(lessons_coll.where(
                filter=FieldFilter('deleted', '!=', True)
            ).stream())

        if len(lessons_data) > 0:
            teacher.lessons = [Lesson(**lessons_data[i].to_dict()) for i in range(len(lessons_data))]

            if include_responses:
                for plan in teacher.lessons:
                    responses_coll: CollectionReference = lessons_coll.document(plan.id).collection('responses')
                    responses = list(responses_coll.stream())
                    if len(responses) > 0:
                        plan.responses = [LessonResponse(**responses[i].to_dict()) for i in range(len(responses))]
                        # Sort by created_at
                        plan.responses.sort(key=lambda r: r.created_at)
            
            # Join class if requesting 1 lesson
            if lesson_id is not None:
                classes_coll: CollectionReference = teacher_ref.collection('classes')
                lesson = teacher.lessons[0]
                lesson.class_data = Class(**classes_coll.document(lesson.class_id).get().to_dict())
                
                students_ref: CollectionReference = classes_coll.document(lesson.class_data.id).collection('students')
                students = list(students_ref.stream())
                if len(students) > 0:
                    lesson.class_data.students = [Student(**students[i].to_dict()) for i in range(len(students))]
                    # Sort students by name
                    lesson.class_data.students.sort(key=lambda student: student.created_at)
            return teacher.lessons


######### Commands


@https_fn.on_request(cors=options.CorsOptions(cors_origins=["*"], cors_methods=["POST", "GET"]))
def configureDefaultLessons(_: https_fn.Request):
    template_lesson_ids_str: str = db.collection('admin_configs').document("current").get().to_dict().get("default_lesson_ids")
    template_lesson_ids = template_lesson_ids_str.split(',')

    # Iterate over entire `teachers` collection and make sure they all have the default lessons with the exact same IDs
    teachers_coll = db.collection('teachers')
    teachers = list(teachers_coll.stream())
    for teacher in teachers:
        teacher_data = TeacherData(**teacher.to_dict())
        teacher_id = teacher_data.id
        teacher_ref = teachers_coll.document(teacher_id)

        teacher_lessons_coll: CollectionReference = teacher_ref.collection('lessons')        
        teacher_lesson_plans_coll: CollectionReference = teacher_ref.collection('lesson_plans')
        teacher_classes_coll: CollectionReference = teacher_ref.collection('classes')

        # Add the default lessons if they're not already there
        for template_lesson_id_str in template_lesson_ids:
            [template_teacher_id, template_lesson_id] = template_lesson_id_str.split(':')
            template_teacher_ref = db.collection('teachers').document(template_teacher_id)
            template_lesson: DocumentSnapshot = template_teacher_ref.collection('lessons').document(template_lesson_id).get()
            template_lesson_plans_coll: CollectionReference = template_teacher_ref.collection('lesson_plans')
            template_lesson_plan: DocumentSnapshot = template_lesson_plans_coll.document(template_lesson.to_dict().get('lesson_plan_id')).get()
            template_classes_coll: CollectionReference = template_teacher_ref.collection('classes')
            template_class_ref = template_classes_coll.document(template_lesson.to_dict().get('class_id'))
            template_class: DocumentSnapshot = template_class_ref.get()
            template_students_coll: CollectionReference = template_class_ref.collection('students')
            template_students_snap: list[DocumentSnapshot] = list(template_students_coll.stream())
            template_students = [Student(**student.to_dict()) for student in template_students_snap]

            # if template_lesson_id not in teacher_lesson_ids:
            teacher_lessons_coll.document(template_lesson_id).set(document_data=template_lesson.to_dict())
            # In the same way, add the lesson plan if it's not already there
            template_lesson_plan_id = template_lesson.to_dict().get('lesson_plan_id')
            # if template_lesson_plan_id not in teacher_lesson_plan_ids:
            template_lesson_plan: DocumentSnapshot = template_lesson_plans_coll.document(template_lesson_plan_id).get()
            teacher_lesson_plans_coll.document(template_lesson_plan_id).set(document_data=template_lesson_plan.to_dict())
            # if template_class_id not in teacher_class_ids:
            template_class_id = template_lesson.to_dict().get('class_id')
            template_class: DocumentSnapshot = db.collection('teachers').document(teacher_id).collection('classes').document(template_class_id).get()
            teacher_classes_coll.document(template_class_id).set(document_data=template_class.to_dict())
            for template_student in template_students:
                teacher_students_coll: CollectionReference = teacher_classes_coll.document(template_class_id).collection('students')
                teacher_students_coll.document(template_student.id).set(document_data=template_student.__dict__)
            

    return "success"


@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def putTeacher(request: https_fn.CallableRequest):
    if request.auth is not None and request.auth.uid is not None:
        emails_allowed_str: str = db.collection('admin_configs').document("current").get().to_dict().get("emails_allowed")
        emails_allowed = emails_allowed_str.split(',')
        if request.auth.token.get('email') in emails_allowed:
            teacher_data: Teacher = Teacher(**request.data)
            teacher_data.user_id = request.auth.uid
            teacher_data.email_address = request.auth.token.get('email')
            if teacher_data.id is not None:
                db.collection('teachers').document(teacher_data.id).set(
                    document_data=teacher_data.__dict__, merge=True
                )
                return "success"
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")
    raise https_fn.HttpsError(code=401, message="login required")


@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def putClass(request: https_fn.CallableRequest):
    if request.auth is not None:
        user: auth.UserRecord = auth.get_user(request.auth.uid)
        if user is not None and user.email is not None:
            teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', user.email)).stream())
            if len(teacherMatches) == 1:
                teacher = TeacherData(**teacherMatches[0].to_dict())
                teacher_id = teacher.id
                class_data = Class(**request.data)
                class_id = class_data.id
                # Don't save nested data
                class_data.students = None
                if teacher is not None and teacher_id is not None and class_id is not None:
                    classes_coll: CollectionReference = db.collection('teachers').document(teacher_id).collection('classes')
                    classes_coll.document(class_id).set(document_data=class_data.__dict__, merge=True)
                    return "success"
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")
    

@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def deleteClass(request: https_fn.CallableRequest):
    if request.auth is not None:
        user: auth.UserRecord = auth.get_user(request.auth.uid)
        if user is not None and user.email is not None:
            teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', user.email)).stream())
            if len(teacherMatches) == 1:
                teacher = TeacherData(**teacherMatches[0].to_dict())
                teacher_id = teacher.id
                class_id = request.data.get('id')
                if teacher is not None and teacher_id is not None and class_id is not None:
                    classes_coll: CollectionReference = db.collection('teachers').document(teacher_id).collection('classes')
                    print("deleting class from collection", classes_coll)
                    doc_ref = classes_coll.document(class_id)
                    print("deleting this", doc_ref.get().to_dict())
                    doc_ref.delete()
                    return "success"
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def putStudent(request: https_fn.CallableRequest):
    if request.auth is not None:
        user: auth.UserRecord = auth.get_user(request.auth.uid)
        if user is not None and user.email is not None:
            teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', user.email)).stream())
            if len(teacherMatches) == 1:
                teacher = TeacherData(**teacherMatches[0].to_dict())
                teacher_id = teacher.id
                student_data = Student(**request.data)
                class_id = student_data.class_id
                student_id = student_data.id
                if teacher_id is not None and class_id is not None and student_id is not None:
                    classes_coll: CollectionReference = db.collection('teachers').document(teacher_id).collection('classes')
                    students_coll: CollectionReference = classes_coll.document(class_id).collection('students')
                    students_coll.document(student_id).set(document_data=student_data.__dict__, merge=True)
                    return "success"
    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def deleteStudent(request: https_fn.CallableRequest):
    if request.auth is not None:
        user: auth.UserRecord = auth.get_user(request.auth.uid)
        if user is not None and user.email is not None:
            teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', user.email)).stream())
            if len(teacherMatches) == 1:
                teacher = TeacherData(**teacherMatches[0].to_dict())
                teacher_id = teacher.id
                class_id = request.data.get('class_id')
                student_id = request.data.get('id')
                if teacher_id is not None and class_id is not None and student_id is not None:
                    classes_coll: CollectionReference = db.collection('teachers').document(teacher_id).collection('classes')
                    students_coll: CollectionReference = classes_coll.document(class_id).collection('students')
                    students_coll.document(student_id).delete()
                    return "success"
    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def putLessonPlan(request: https_fn.CallableRequest):
    if request.auth is not None:
        user: auth.UserRecord = auth.get_user(request.auth.uid)
        if user is not None and user.email is not None:
            teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', user.email)).stream())
            if len(teacherMatches) == 1:
                teacher = TeacherData(**teacherMatches[0].to_dict())
                teacher_id = teacher.id
                plan_data = LessonPlan(**request.data)

                # Don't save nested data!
                plan_data.questions = None

                plan_id = plan_data.id
                if teacher_id is not None and plan_data is not None:
                    db.collection('teachers').document(teacher_id).collection(
                        'lesson_plans').document(plan_id).set(
                            document_data=plan_data.__dict__, merge=True)
                    return "success"
    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def deleteLessonPlan(request: https_fn.CallableRequest):
    if request.auth is not None:
        user: auth.UserRecord = auth.get_user(request.auth.uid)
        if user is not None and user.email is not None:
            teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', user.email)).stream())
            if len(teacherMatches) == 1:
                teacher = TeacherData(**teacherMatches[0].to_dict())
                teacher_id = teacher.id
                plan_id = request.data.get('id')
                if teacher_id is not None and plan_id is not None:
                    db.collection('teachers').document(teacher_id).collection('lesson_plans').document(plan_id).delete()
                    return "success"
    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def putLessonQuestion(request: https_fn.CallableRequest):
    if request.auth is not None:
        user: auth.UserRecord = auth.get_user(request.auth.uid)
        if user is not None and user.email is not None:
            teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', user.email)).stream())
            if len(teacherMatches) == 1:
                teacher = TeacherData(**teacherMatches[0].to_dict())
                teacher_id = teacher.id
                question_data = LessonQuestion(**request.data)
                lesson_plan_id = question_data.lesson_plan_id
                question_id = question_data.id
                if teacher_id is not None and lesson_plan_id is not None and question_data is not None:

                    # Save the question
                    db.collection('teachers').document(teacher_id).collection(
                        'lesson_plans').document(lesson_plan_id).collection(
                            'questions').document(question_id).set(
                                document_data=question_data.__dict__, merge=True)

                    return "success"
    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def deleteLessonQuestion(request: https_fn.CallableRequest):
    if request.auth is not None:
        user: auth.UserRecord = auth.get_user(request.auth.uid)
        if user is not None and user.email is not None:
            teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', user.email)).stream())
            if len(teacherMatches) == 1:
                teacher = TeacherData(**teacherMatches[0].to_dict())
                teacher_id = teacher.id
                lesson_plan_id = request.data.get('lesson_plan_id')
                question_id = request.data.get('id')
                if teacher_id is not None and lesson_plan_id is not None and question_id is not None:
                    db.collection('teachers').document(teacher_id).collection('lesson_plans').document(lesson_plan_id).collection('questions').document(question_id).delete()
                    return "success"
                raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


# Lock answers and do analysis, return when done
@https_fn.on_call(cors=options.CorsOptions(cors_origins=["*"]))
def putLesson(request: https_fn.CallableRequest):
    if request.auth is not None:
        user: auth.UserRecord = auth.get_user(request.auth.uid)
        if user is not None and user.email is not None:
            teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', user.email)).stream())
            if len(teacherMatches) == 1:
                teacher = TeacherData(**teacherMatches[0].to_dict())
                teacher_id = teacher.id
                teacher_ref = db.collection('teachers').document(teacher_id)
                new_lesson = Lesson(**request.data)

                # Don't save nested data!
                new_lesson.responses = None
                new_lesson.class_data = None
                new_lesson.lesson_plan = None

                lesson_id = new_lesson.id
                if teacher_id is not None and new_lesson is not None:
                    lesson_ref: DocumentReference = teacher_ref.collection('lessons').document(lesson_id)
                    old_lesson_exists = lesson_ref.get().exists
                    old_lesson = Lesson(**lesson_ref.get().to_dict()) if old_lesson_exists else None

                    # Supporting soft-delete: if the lesson didn't exist before, set deleted to False
                    # (Enforcing non-nullness on this field makes queries easier)
                    if old_lesson is None:
                        new_lesson.deleted = False

                    # Save the lesson, now that we have the old data in memory
                    lesson_ref.set(document_data=new_lesson.__dict__, merge=True)
                    print("lesson saved")

                    # If the lesson existed (this is an update, not a create), check if we're going from not locked to locked
                    if old_lesson is not None and len(new_lesson.questions_locked) > len(old_lesson.questions_locked):
                        responses: List[DocumentSnapshot] = list(lesson_ref.collection('responses').stream())

                        # attempts_remaining = 15
                        # # Analysis happens asynchronously when the student submits the response
                        # # Poll until all responses are analyzed
                        # while True:
                        #     responses = list(lesson_ref.collection('responses').stream())
                        #     responses = [LessonResponse(**response.to_dict()) for response in responses]
                        #     if attempts_remaining == 0:
                        #         break
                        #     if all(
                        #         response.analysis is not None
                        #         for response in responses
                        #     ):
                        #         break
                        #     else:
                        #         attempts_remaining -= 1
                        #         asyncio.sleep(2)
                        
                        if len(responses) == 0:
                            raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="no responses to analyze")
                        
                        # Then, analyze the lesson overall
                        lesson = Lesson(**lesson_ref.get().to_dict())
                        lesson_plan_ref: DocumentReference = teacher_ref.collection('lesson_plans').document(lesson.lesson_plan_id)
                        questions_ref: CollectionReference = lesson_plan_ref.collection('questions')
                        lesson_questions = list(questions_ref.stream())
                        lesson_questions = [LessonQuestion(**lesson_questions[i].to_dict()) for i in range(len(lesson_questions))]
                        analysis_by_question_id: dict[str, Dict[str, Any]] = {}
                        preset_categories: list[str] = []
                        for question in lesson_questions:

                            responses_to_question = [response for response in responses if response.to_dict().get('question_id') == question.id]

                            # If no responses, skip
                            if len(responses_to_question) == 0:
                                continue

                            # If the analysis is already done, skip
                            if lesson.analysis_by_question_id is not None and question.id in lesson.analysis_by_question_id and lesson.analysis_by_question_id[question.id] is not None:
                                analysis = lesson.analysis_by_question_id[question.id]
                                preset_categories = analysis.responses_by_category.keys()
                                continue

                            llm_messages = []
                            llm_messages.append({
                                "role": "user",
                                "content": dedent(f"""
                                    You are an experienced high school teacher, and my assistant for this lesson.
                                    You also have experience coding in JSON and are a stickler for formatting.
                                    I asked my high school students the following question:
                                    "{question.body_text}"
                                """),
                            })

                            # Add context (supporting materials) if any
                            ctx_materials_message_content = []
                            for ctx_material_url in question.context_material_urls:
                                file_name: str = ctx_material_url.split('/')[-1].split('?')[0]
                                file_ext: str = file_name.split('.')[-1]
                                file_ext_lower = file_ext.lower()
                                if file_ext_lower in ['pdf']:
                                    ctx_materials_message_content.append({
                                        "type": "document",
                                        "source": {
                                            "type": "base64",
                                            "media_type": "application/pdf",
                                            "data": get_as_base64(ctx_material_url),
                                        },
                                    })
                                elif file_ext_lower in ['png', 'jpg', 'jpeg']:
                                    if file_ext_lower == 'jpg':
                                        file_ext_lower = 'jpeg'
                                    ctx_materials_message_content.append({
                                        "type": "image",
                                        "source": {
                                            "type": "base64",
                                            "media_type": f"image/{file_ext_lower}",
                                            "data": get_as_base64(ctx_material_url),
                                        },
                                    })
                            if len(ctx_materials_message_content) > 0:
                                ctx_materials_message_content = [{
                                    "type": "text",
                                    "text": "The following supporting materials are relevant to the question:",
                                }] + ctx_materials_message_content
                                llm_messages.append({
                                    "role": "user",
                                    "content": ctx_materials_message_content,
                                })

                            # Add categorization_guidance if any
                            if len(preset_categories) > 0:
                                llm_messages.append({
                                    "role": "user",
                                    "content": [{
                                        "type": "text",
                                        "text": "Please use the following categories in your analysis:\n\n"+
                                            ", ".join(preset_categories)+"\n\n"+
                                            "Consider ALL of these carefully when deciding how to categorize each student's response.",
                                    }],
                                })
                            elif question.categorization_guidance is not None:
                                llm_messages.append({
                                    "role": "user",
                                    "content": [{
                                        "type": "text",
                                        "text": "Please use the following as guidance for how to categorize responses:\n\n"+
                                            question.categorization_guidance+"\n\n"+
                                            "Consider ALL of the categories mentioned here carefully when deciding how to categorize each student's response.",
                                    }],
                                })

                            # Add the student responses
                            lesson_responses_message_content = [{
                                "type": "text",
                                "text": "Now here are my students' responses:", # TODO: Add anti-prompt-injection language?
                            }]
                            for resp in responses_to_question:
                                lesson_responses_message_content.append({
                                    "type": "text",
                                    "text": f"{resp.get('student_name')} answered: {resp.get('analysis.response_summary')}",
                                })
                            llm_messages.append({
                                "role": "user",
                                "content": lesson_responses_message_content
                            })

                            # Get the analysis
                            llm_messages.append({
                                "role": "user",
                                "content": dedent(f"""
                                    As my assistant, you have one task that will help me administer this lesson: sort the students' responses into categories. The categories will be used to organize discussion groups that ideally lead to each student reworking their own hypothesis to reach a deep understanding of the explanation provided in their textbook.
                                    
                                    While answers might vary a lot, do your best to categorize in a way that will help the students draw connections between each other's explanations.
                                    
                                    Pay extra attention to any guidance I have already provided on which categories to use. I expect all of my category suggestions to be considered thoughtfully.
                                    
                                    Your next response should be output in JSON format, as a JSON array structured as follows: each element must be an object with 2 fields, "category" and "student_name", each containing a string.
                                    Make sure every single student is included in the array, and that each student belongs to exactly one category.
                                    
                                    Respond with the JSON array ONLY, and no other text.
                                """),
                            })
                            client = Anthropic(api_key=ANTHROPIC_API_KEY.value)
                            message = client.messages.create(
                                model="claude-3-5-sonnet-20240620",
                                max_tokens=1024,
                                messages=llm_messages,
                            )
                            print("Claude responded with content:")
                            print(message.content)
                            message_text = message.content[0].text
                            if not message_text.startswith("["):
                                message_text = message_text.split("[")[1].split("]")[0]
                            analyses_raw: list[dict[str, str]] = json.loads(message_text)

                            # Map the analysis to the LessonQuestionAnalysis object
                            responses_by_student_name: dict[str, LessonResponse] = {}
                            for resp in responses_to_question:
                                responses_by_student_name[resp.get('student_name')] = LessonResponse(**resp.to_dict())
                            responses_by_category: dict[str, list[LessonResponse]] = {}
                            for analysis_raw in analyses_raw:
                                category = analysis_raw.get('category').capitalize()
                                student_name = analysis_raw.get('student_name')
                                if category not in responses_by_category:
                                    responses_by_category[category] = []
                                responses_by_category[category].append(
                                    responses_by_student_name.get(student_name).__dict__
                                )
                            analysis = LessonQuestionAnalysis(
                                question_id=question.id,
                                responses_by_category=responses_by_category,
                            )
                            # Add it to analysis_by_question_id on the Lesson object
                            analysis_by_question_id[analysis.question_id] = analysis.__dict__

                        # Back at the Lesson level -- save the new analysis_by_question_id
                        lesson_ref.set(
                            document_data={"analysis_by_question_id": analysis_by_question_id},
                            merge=True,
                        )

                    # Whether this was an update or a create, return the new lesson
                    return Lesson(**lesson_ref.get().to_dict())
    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


##########################################################
# PUBLIC API


@https_fn.on_request(cors=options.CorsOptions(cors_origins=["*"], cors_methods=["POST"]))
def getLesson(request: https_fn.Request):
    if request.method == 'POST':
        data: Dict[str, str] = request.get_json().get('data')
        if data.get('teacher_email') is not None:
            teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', data.get('teacher_email'))).stream())
            if len(teacherMatches) == 1:
                teacher = TeacherData(**teacherMatches[0].to_dict())
                lessons = _getLessons(teacher, True, data.get('id'))
                for lesson in lessons:
                    lesson.lesson_plan = _getLessonPlans(teacher, True, lesson.lesson_plan_id)[0]
                return https_fn.Response(
                    response=json.dumps({
                        "result": dataclasses.asdict(lessons[0]),
                    }),
                )
    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


@https_fn.on_request(cors=options.CorsOptions(cors_origins=["*"], cors_methods=["POST"]))
def putLessonResponse(request: https_fn.Request):
    lesson_resp_data = LessonResponse(**request.get_json().get('data'))
    teacher_email = lesson_resp_data.teacher_email
    lesson_id = lesson_resp_data.lesson_id
    question_id = lesson_resp_data.question_id
    teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', teacher_email)).stream())
    if len(teacherMatches) == 1 and lesson_id is not None and question_id is not None:
        teacher = TeacherData(**teacherMatches[0].to_dict())

        # Look up the lesson
        teacher_ref = db.collection('teachers').document(teacher.id)
        lessons_coll: CollectionReference = teacher_ref.collection('lessons')
        lesson = Lesson(**lessons_coll.document(lesson_id).get().to_dict())

        # Look up the question via the lesson_plan
        lesson_plans_coll: CollectionReference = teacher_ref.collection('lesson_plans')
        lesson_plan = LessonPlan(**lesson_plans_coll.document(lesson.lesson_plan_id).get().to_dict())
        questions_coll: CollectionReference = lesson_plans_coll.document(lesson_plan.id).collection('questions')
        question_data = LessonQuestion(**questions_coll.document(question_id).get().to_dict())

        if question_data is not None:
            # If responses are locked, return
            if lesson.questions_locked is not None and question_data.id in lesson.questions_locked:
                raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="responses locked")

            # Save the response data
            responses_coll: CollectionReference = lessons_coll.document(lesson_id).collection('responses')
            responses_coll.document(lesson_resp_data.id).set(document_data=lesson_resp_data.__dict__, merge=True)

            # In the background, use the LLM to summarize each response for easier use later
            asyncio.new_event_loop().run_until_complete(
                analyze_lesson_response(
                    question_data,
                    responses_coll.document(lesson_resp_data.id),
                    lesson_resp_data,
                )
            )

            return https_fn.Response(
                response=json.dumps({
                    "result": "success",
                }),
            )
    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


@https_fn.on_request(cors=options.CorsOptions(cors_origins=["*"], cors_methods=["POST"]))
def postStudentNameStarted(request: https_fn.Request):
    req_data = request.get_json().get('data')
    student_name = req_data.get('student_name')
    teacher_email = req_data.get('teacher_email')
    lesson_id = req_data.get('lesson_id')
    teacherMatches = list(db.collection('teachers').where(filter=FieldFilter('email_address', '==', teacher_email)).stream())
    if len(teacherMatches) == 1 and lesson_id is not None:
        teacher = TeacherData(**teacherMatches[0].to_dict())
        teacher_ref = db.collection('teachers').document(teacher.id)
        lessons_coll: CollectionReference = teacher_ref.collection('lessons')
        lesson_doc_ref: DocumentReference = lessons_coll.document(lesson_id)
        lesson = Lesson(**lesson_doc_ref.get().to_dict())
        if lesson.student_names_started is None:
            lesson.student_names_started = []
        lesson.student_names_started.append(student_name)
        lesson_doc_ref.set(document_data=lesson.__dict__, merge=True)
        return https_fn.Response(
            response=json.dumps({
                "result": "success",
            }),
        )
    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION, message="invalid request")


async def analyze_lesson_response(
    question_data: LessonQuestion,
    lesson_response_doc_ref: DocumentReference,
    lesson_resp_data: LessonResponse,
):
    # Use the student's raw response text as the summary by default
    summary = lesson_resp_data.response_text

    # If the student responded with a drawing, use Claude to summarize it, and append it to the summary
    if lesson_resp_data.response_has_drawing and len(lesson_resp_data.response_image_base64) > 0:
        llm_messages = []
        message_content = [
            {
                "type": "text",
                "text": f"I asked my high school class the following question: {question_data.body_text}",
            },
            {
                "type": "text",
                "text": f"{lesson_resp_data.student_name} answered:",
            },
        ]
        message_content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": lesson_resp_data.response_image_base64.replace("data:image/png;base64,", ""),
            },
        })
        message_content.append({
            "type": "text",
            "text": dedent(f"""
                Your response should be a summary of this drawing that carefully considers how {lesson_resp_data.student_name}'s drawing is attempting to answer the question I asked the class.
                If you see any text in it, include the exact text in your summary.
                Give the student the benefit of the doubt, but don't be afraid to analyze with a critical eye.
                Your summary should be as brief as possible while being comprehensive.
            """),
        })
        llm_messages.append({
            "role": "user",
            "content": message_content,
        })
        client = Anthropic(api_key=ANTHROPIC_API_KEY.value)
        print("Calling Anthropic API -- messages.create()")
        message = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=1024,
            messages=llm_messages,
        )
        print("Claude responded with content:")
        print(message.content)
        # Append it to the summary
        summary = summary + "\n\n" if len(summary) > 0 else summary
        summary = summary + message.content[0].text

    # Save the summary
    lesson_response_doc_ref.set(document_data={"analysis": {"response_summary": summary}}, merge=True)


def get_as_base64(url):
    # return base64.b64encode(requests.get(url).content)
    # Return a base64 string of whatever url serves
    return base64.b64encode(requests.get(url).content).decode('utf-8').replace("data:image/png;base64,", "")
