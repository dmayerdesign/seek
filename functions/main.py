# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from firebase_functions import https_fn
from firebase_functions.params import IntParam, StringParam
# The Firebase Admin SDK to access Cloud Firestore.
from firebase_admin import initialize_app
from openai import OpenAI
import os
from anthropic import Anthropic

app = initialize_app()

OPENAI_API_KEY = StringParam("OPENAI_API_KEY")
ANTHROPIC_API_KEY = StringParam("ANTHROPIC_API_KEY")

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
    
    if request.method == "GET" and request_args and "topic" in request_args:
        topic = request_args["topic"]

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful teaching assistant."},
                {"role": "user", "content": f"Give me 1 open-ended question about {topic} at a 10th grade level."},
            ]
        )

        return response.choices[0].message.content
  
        # question = response.choices[0].message.content
    
        # response_2 = client.chat.completions.create(
        #     model="gpt-4o-mini",
        #     messages=[
        #         {"role": "system", "content": "You are an intelligent high school student in the USA."},
        #         {"role": "user", "content": f"Give me 4 answers to this question: {question}, at a 10th grade level."},
        #     ]
        # )
        # return question

        # answers = response_2.choices[0].message.content
        # return answers
        # response.to_json()
    
    return f"fail"

@https_fn.on_request()
def anthropic_test(request: https_fn.Request):
    request_args = request.args

    if request.method == "GET":
        client = Anthropic(api_key=ANTHROPIC_API_KEY.value)
        if request_args and "topic" in request_args:
            topic = request_args["topic"]
            message = client.messages.create(
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": f"Give me 1 open-ended question about {topic} at a 10th grade level."},
                ],
                model="claude-3-opus-20240229",
            )
            return message.content
        elif request_args and "leaf" in request_args:
            leaf_img_data = "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"
            media_type = "image/png"
            message = client.messages.create(
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
                model="claude-3-opus-20240229",
            )
            return message.content
    return ""
