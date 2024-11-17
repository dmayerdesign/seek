# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from textwrap import dedent
from typing import List
from firebase_functions import https_fn, options
from firebase_functions.params import IntParam, StringParam
# The Firebase Admin SDK to access Cloud Firestore.
from firebase_admin import initialize_app
from firebase_admin import firestore
import asyncio
from anthropic import AsyncAnthropic
from data_model import Lesson, LessonQuestion, LessonResponse
# from functions import data_model

# OPENAI_API_KEY = StringParam("OPENAI_API_KEY")
ANTHROPIC_API_KEY = StringParam("ANTHROPIC_API_KEY")

app = initialize_app()
db = firestore.client()

async def ask_about_topic(client: AsyncAnthropic, topic: str):
    message = await client.messages.create(
        max_tokens=1024,
        messages=[
            {"role": "user", "content": f"Give me 1 open-ended question about {topic} of your choice at a 10th grade level."},
        ],
        model="claude-3-5-sonnet-20240620",
    )
    print("got message.content:")
    return message.content[0].text

async def process_student_response(
    client: AsyncAnthropic,
    topic: str,
    question: str,
    student_response: LessonResponse,
    categories: List[str],
):
    # id
    # question_id
    # response_category
    # response_category_explanation
    # response_category_alternatives
    message = await client.messages.create(
        # max_tokens=4012,
        messages=[
            {
                "role": "user",
                "content": dedent(f"""\
                    Your task is to analyze the following student response to this question about {topic}: "{question}".

                    The student responded:
                    "{student_response.body_text}"
                    
                    Respond with a JSON object with 3 fields: "response_category", "response_category_explanation", and "response_category_alternatives".
                    "response_category" should be one of these: {", ".join(categories)}.
                    "response_category_explanation" should be a brief explanation of why the response fits that category.
                    "response_category_alternatives" should be a list of other categories that could also apply to the response, if any.
                """),
            },
        ],
        model="claude-3-5-sonnet-20240620",
    )
    return message.content[0].text

@https_fn.on_request()
def anthropic_test(request: https_fn.Request):
    client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY.value)
    request_args = request.args

    if request.method == "GET":
        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY.value)
        if request_args and "topic" in request_args:
            topic = request_args["topic"]
            tasks = [ask_about_topic(client, topic), ask_about_topic(client, topic)]
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop.run_until_complete(asyncio.gather(*tasks))
        elif request_args and "leaf" in request_args:
            leaf_img_data = "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"
            media_type = "image/png"
            message = client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": leaf_img_data,
                                },
                            },
                            {
                                "type": "text",
                                "text": "Please describe this drawing. If you see any text in it, include the exact text in your description. Otherwise, simply do your best to describe what you think it depicts.",
                            },
                        ]
                    },
                ],
            )
            return message.content
    return ""

@https_fn.on_request(cors=options.CorsOptions(cors_origins=["*"], cors_methods=["GET"]))
def getTeacherData(request: https_fn.Request):
    if request.method == "GET":
        teacher_id = request.args.get('teacher_id')
        if teacher_id is not None:
            teacher_ref = db.collection('teachers').document(teacher_id)
            teacher_data = teacher_ref.get().to_dict()
            classes = list(teacher_ref.collection('classes').stream())
            if len(classes) > 0:
                teacher_data['classes'] = [classes[i].to_dict() for i in range(len(classes))]
                for cls in teacher_data['classes']:
                    students = list(teacher_ref.collection('classes').document(cls['id']).collection('students').stream())
                    if len(students) > 0:
                        cls['students'] = [students[i].to_dict() for i in range(len(students))]
            return teacher_data
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def getLessonPlans(request: https_fn.Request):
    if request.method == "GET":
        teacher_id = request.args.get('teacher_id')
        if teacher_id is not None:
            plans = db.collection('teachers').document(teacher_id).collection('lesson_plans').stream()
            return [plan.to_dict() for plan in plans]
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def getLessons(request: https_fn.Request):
    if request.method == "GET":
        teacher_id = request.args.get('teacher_id')
        if teacher_id is not None:
            lessons = db.collection('teachers').document(teacher_id).collection('lessons').stream()
            return [lesson.to_dict() for lesson in lessons]
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def getLesson(request: https_fn.Request):
    if request.method == "GET":
        lesson_id = request.args.get('lesson_id')
        if lesson_id is not None:
            return db.collection('lessons').document(lesson_id).get().to_dict()
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def putTeacher(request: https_fn.Request):
    if request.method in ["POST", "PUT"]:
        teacher_data = request.get_json()
        teacher_id = teacher_data['id']
        if teacher_id is not None:
            db.collection('teachers').document(teacher_id).set(teacher_data)
            return "success"
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def putClass(request: https_fn.Request):
    if request.method in ["POST", "PUT"]:
        teacher_id = request.args.get('teacher_id')
        class_data = request.get_json()
        if teacher_id is not None and class_data is not None:
            db.collection('teachers').document(teacher_id).collection('classes').document(class_data['id']).set(class_data)
            return "success"
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def putStudent(request: https_fn.Request):
    if request.method in ["POST", "PUT"]:
        teacher_id = request.args.get('teacher_id')
        class_id = request.args.get('class_id')
        student_data = request.get_json()
        if teacher_id is not None and class_id is not None and student_data is not None:
            db.collection('teachers').document(teacher_id).collection('classes').document(class_id).collection('students').document(student_data['id']).set(student_data)
            return "success"
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def deleteStudent(request: https_fn.Request):
    if request.method in ["POST", "DELETE"]:
        teacher_id = request.args.get('teacher_id')
        class_id = request.args.get('class_id')
        student_id = request.args.get('student_id')
        if teacher_id is not None and class_id is not None and student_id is not None:
            db.collection('teachers').document(teacher_id).collection('classes').document(class_id).collection('students').document(student_id).delete()
            return "success"
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def putLessonPlan(request: https_fn.Request):
    if request.method in ["POST", "PUT"]:
        teacher_id = request.args.get('teacher_id')
        plan_data = request.get_json()
        plan_id = plan_data['id']
        if teacher_id is not None and plan_data is not None:
            db.collection('teachers').document(teacher_id).collection('lesson_plans').document(plan_id).set(plan_data)
            return "success"
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def deleteLessonPlan(request: https_fn.Request):
    if request.method in ["POST", "DELETE"]:
        teacher_id = request.args.get('teacher_id')
        plan_id = request.args.get('plan_id')
        if teacher_id is not None and plan_id is not None:
            db.collection('teachers').document(teacher_id).collection('lesson_plans').document(plan_id).delete()
            return "success"
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def putLessonQuestion(request: https_fn.Request):
    if request.method in ["POST", "PUT"]:
        teacher_id = request.args.get('teacher_id')
        plan_id = request.args.get('plan_id')
        question_data: LessonQuestion = request.get_json()
        question_id = question_data.id
        if teacher_id is not None and plan_id is not None and question_data is not None:
            # First, ask the LLM to analyze the question
            client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY.value)
            # additional_context_summarized
            # suggested_response_categories
            additional_ctx = "Additional context: none provided"
            if question_data.additional_context is not None and question_data.additional_context != "":
                additional_ctx = "\n".join([
                    "Additional context:",
                    "Use the following material from the curriculum to inform your analysis:\n",
                    "----- BEGIN SUPPORTING MATERIAL -----",
                    "{question_data.additional_context}",
                    "----- END SUPPORTING MATERIAL -----",
                ])
            message = client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": dedent(f"""\
                            I am teaching my {question_data.field_of_study} class about {question_data.specific_topic}.

                            {additional_ctx}

                            Now please analyze the following question: "{question_data.additional_context}"

                            Respond with a single JSON object containing 2 fields, "additional_context_summarized" and "suggested_response_categories".
                            "additional_context_summarized" should be a string with a summary (2 paragraphs at most) of the "Additional context" provided above.
                            "suggested_response_categories" should be a list of strings, each representing a category of response that students might give to the question.
                            Think carefully about what to include in "suggested_response_categories" so that every student sees their response categorized in a way that guides them to a better understanding of the topic.
                        """)
                    },
                ],
            )

            db.collection('teachers').document(teacher_id).collection('lesson_plans').document(plan_id).collection('questions').document(question_id).set(question_data)
            return "success"
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def deleteLessonQuestion(request: https_fn.Request):
    if request.method in ["POST", "DELETE"]:
        teacher_id = request.args.get('teacher_id')
        plan_id = request.args.get('plan_id')
        question_id = request.args.get('question_id')
        if teacher_id is not None and plan_id is not None and question_id is not None:
            db.collection('teachers').document(teacher_id).collection('lesson_plans').document(plan_id).collection('questions').document(question_id).delete()
            return "success"
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

# Lock answers and do analysis, return when done
@https_fn.on_request()
def putLesson(request: https_fn.Request):
    if request.method in ["POST", "PUT"]:
        teacher_id = request.args.get('teacher_id')
        lesson_data: Lesson = request.get_json()
        lesson_id = lesson_data.id
        if teacher_id is not None and lesson_data is not None:
            # If the lesson exists, check if we're going from not locked to locked
            lesson_ref = db.collection('teachers').document(teacher_id).collection('lessons').document(lesson_id)
            lesson: Lesson = lesson_ref.get().to_dict()
            if lesson is not None and not lesson.responses_locked and lesson_data.responses_locked:
                lesson_data.analyzing = True
                # In the background, do the anaylsis with the LLM
                client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY.value)
                tasks = []
                for response in lesson_data.responses:
                    tasks.append(process_student_response(client, response))
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                return loop.run_until_complete(asyncio.gather(*tasks))
            db.collection('teachers').document(teacher_id).collection('lessons').document(lesson_id).set(lesson_data)
            return "success"
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def putLessonResponse(request: https_fn.Request):
    if request.method in ["POST", "PUT"]:
        teacher_id = request.args.get('teacher_id')
        lesson_id = request.args.get('lesson_id')
        response_data = request.get_json()
        response_id = response_data['id']
        if teacher_id is not None and lesson_id is not None and response_data is not None:
            db.collection('teachers').document(teacher_id).collection('lessons').document(lesson_id).collection('responses').document(response_id).set(response_data)
            return "success"
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)

@https_fn.on_request()
def putLessonAnalysis(request: https_fn.Request):
    if request.method in ["POST", "PUT"]:
        teacher_id = request.args.get('teacher_id')
        lesson_id = request.args.get('lesson_id')
        analysis_data = request.get_json()
        analysis_id = analysis_data['id']
        if teacher_id is not None and lesson_id is not None and analysis_data is not None:
            db.collection('teachers').document(teacher_id).collection('lessons').document(lesson_id).collection('analysis').document(analysis_id).set(analysis_data)
            return "success"
        return https_fn.Response("invalid request", status=400)
    return https_fn.Response("method not allowed", status=400)
