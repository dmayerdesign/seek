# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from firebase_functions import https_fn
from firebase_functions.params import IntParam, StringParam
# The Firebase Admin SDK to access Cloud Firestore.
from firebase_admin import initialize_app
from openai import OpenAI

app = initialize_app()

OPENAI_API_KEY = StringParam("OPENAI_API_KEY")

@https_fn.on_request()
def hello_world_name(request: https_fn.Request):
    request_json = request.get_json(silent=True)
    request_args = request.args

    if request.method == "POST" and request_json and "name" in request_json:
        name = request_json["name"]
    elif request.method == "GET" and request_args and "name" in request_args:
        name = request_args["name"]
    else:
        name = "World"
    return f"Hello {name}! This works!"

response = ""

@https_fn.on_request()
def openai_test(request: https_fn.Request):
    client = OpenAI(api_key = OPENAI_API_KEY.value)
    request_args = request.args
    
    if request.method == "GET" and request_args and "prompt" in request_args:
        name = request_args["prompt"]

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful teaching assistant."},
                {"role": "user", "content": f"Give me 1 open-ended question about {name} at a 10th grade level."},
            ]
        )
  
        question = response.choices[0].message.content
    
        response_2 = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an intelligent high school student in the USA."},
                {"role": "user", "content": f"Give me 4 answers to this question: {question}, at a 10th grade level."},
            ]
         )
    
        answers = response_2.choices[0].message.content
        return question
        return answers
    
        # response.to_json()
    
    return f"fail"