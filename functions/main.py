# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from firebase_functions import https_fn
from firebase_functions.params import IntParam, StringParam
# The Firebase Admin SDK to access Cloud Firestore.
from firebase_admin import initialize_app

app = initialize_app()

WELCOME_MESSAGE = StringParam("WELCOME_MESSAGE")

# To use configured parameters inside the config for a function, provide them
# directly. To use them at runtime, call .value() on them.
@https_fn.on_request()
def hello_world_welcome():
    return https_fn.Response(f'{WELCOME_MESSAGE.value()}! I am a function!')

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
