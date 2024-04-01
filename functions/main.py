# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from firebase_functions import https_fn

# The Firebase Admin SDK to access Cloud Firestore.
from firebase_admin import initialize_app, firestore
import google.cloud.firestore

app = initialize_app()


@https_fn.on_request()
def hello_http(request: https_fn.Request):
    request_json = request.get_json(silent=True)
    request_args = request.args

    if request.method == "POST" and request_json and "name" in request_json:
        name = request_json["name"]
    elif request.method == "GET" and request_args and "name" in request_args:
        name = request_args["name"]
    else:
        name = "World"
    return f"Hello {name}!"
