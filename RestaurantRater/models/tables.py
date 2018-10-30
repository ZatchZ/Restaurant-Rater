import datetime 

def get_user_email():
	return None if auth.user is None else auth.user.get_user_email

def get_current_time():
	return datetime.datetime.utcnow()

db.define_table('restaurant'
				Field('location','text'),
				Field('description','text'),
				Field('type','text'),
				Field('rating','double'),
				Field('date_established','date'),
				Field('menu_id','reference image'), #upload menu as image
				#Field('michelin_star_rating','text'),   not sure what type is it
				#Field('aaa_rating','text')   
	)


db.define_table('user_data'
				Field('profile_create_date', 'datetime', update=get_current_time()),
				Field('date_of_birth',"date"),
				Field('location','text'),
				Field('user_rating','double'),
				Field('uploaded_images_id','reference image'),
				Field('post_id','reference post'),
				Field('comment_id','reference comment'),
				Field('past_restaurant_reviewed','reference restaurant'),
				#Field('user_preference','text'),
				#Field('prestige_level','double'),
	)


db.define_table('image',
				Field('title', unique=True),
				Field('file', 'upload'),
 				format = '%(title)s')

db.post.image_id.readable = db.post.image_id.writable = False
db.image.title.requires = IS_NOT_IN_DB(db, db.image.title)
db.post.image_id.requires = IS_IN_DB(db, db.image.id, '%(title)s')
db.post.author.requires = IS_NOT_EMPTY()
db.post.email.requires = IS_EMAIL()
db.post.body.requires = IS_NOT_EMPTY()


db.define_table('post',
                Field('post_author', default=get_user_email()),
                Field('post_title'),
                Field('post_content', 'text'),
                Field('post_time', 'datetime', update=get_current_time()),
                )

db.post.post_time.readable = db.post.post_time.writable = False
db.post.post_author.writable = False
db.post.id.readable = False

db.define_table('comment',
                Field('post_id', 'reference post'),
                Field('comment_author', default=get_user_email()),
                Field('comment_content', 'text'),
                Field('comment_time', 'datetime', update=get_current_time())
                )