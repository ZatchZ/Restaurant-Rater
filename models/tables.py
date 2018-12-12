# Define your tables below (or better in another model file) for example
#
# >>> db.define_table('mytable', Field('myfield', 'string'))
#
# Fields can be 'string','text','password','integer','double','boolean'
#       'date','time','datetime','blob','upload', 'reference TABLENAME'
# There is an implicit 'id integer autoincrement' field
# Consult manual for more options, validators, etc.




# after defining tables, uncomment below to enable auditing
# auth.enable_record_versioning(db)


import datetime

def get_user_email():
    return None if auth.user is None else auth.user.email

def get_current_time():
    return datetime.datetime.utcnow()

db.define_table('post',
                Field('post_author', default=get_user_email()),
                Field('post_title'),
                Field('post_content', 'text'),
                Field('post_category', 'text'),
                Field('post_address', 'text'),
                Field('post_time', 'datetime', default=get_current_time()),
                )

# Replies
db.define_table('reply',
                Field('post_id', 'reference post'),
                Field('reply_author', default=get_user_email()),
                Field('reply_content', 'text'),
                Field('reply_time', 'datetime', update=get_current_time()),
                Field('rating0', 'integer', default=None), # The star ratings.
                Field('rating1', 'integer', default=None), # The star ratings.
                Field('rating2', 'integer', default=None) # The star ratings.
                )

# Thumbs
db.define_table('thumb',
                Field('user_email'), # The user who thumbed, easier to just write the email here.
                Field('reply_id', 'reference reply'), # The thumbed reply
                Field('thumb_state'), # This can be 'u' for up or 'd' for down, or None for... None.
                )


# db.reply.post_id.readable = db.reply.post_id.writable = False
# db.reply.reply_author.readable = db.reply.reply_author.writable = False
# db.reply.reply_time.readable = db.reply.reply_time.writable = False
# db.reply.id.readable = False