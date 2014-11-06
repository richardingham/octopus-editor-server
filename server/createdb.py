import sqlite3

conn = sqlite3.connect('../octopus.db')

# Create tables

conn.execute('''CREATE TABLE sketches
	(guid text, title text, user_id integer, created_date datetime, modified_date datetime)''')

conn.execute('''CREATE TABLE experiments
	(guid text, sketch_guid text, user_id integer, started_date datetime)''')
