import requests

url = "https://wttr.in/Accra?format=j1"

data = requests.get(url).json()

temp = data["current_condition"][0]["temp_C"]
humidity = data["current_condition"][0]["humidity"]

print("Temperature:", temp, "°C")
print("Humidity:", humidity, "%")
