# Here go your api methods.


@auth.requires_signature()
def add_post():
    post_id = db.post.insert(
        post_title=request.vars.post_title,
        post_content=request.vars.post_content,
        post_category=None if request.vars.post_category == "" else request.vars.post_category,
    )
    # We return the id of the new post, so we can insert it along all the others.
    return response.json(dict(post_id=post_id))


@auth.requires_signature()
def edit_post():
    row = db(db.post.id == request.vars.post_id).select().first()
    row.update_record(
        post_title=request.vars.post_title,
        post_content=request.vars.post_content,
        post_category=request.vars.post_category,
        )
    return

def get_post_list():
    results = []
    cat = request.vars.post_category
    search = request.vars.search_term.lower()
    if cat == "" :
        rows = db().select(db.post.ALL,orderby=~db.post.post_time)
    else:
        rows = db(db.post.post_category == cat).select(db.post.ALL,orderby=~db.post.post_time)
    for row in rows:
        t = row.post_title.lower()
        c = row.post_content.lower()
        if t.find(search) < 0:
            if c.find(search) < 0:
                continue
        results.append(dict(
                id=row.id,
                post_title=row.post_title,
                post_content=row.post_content,
                post_author=row.post_author,
                post_category=row.post_category,
        ))
    # For homogeneity, we always return a dictionary.
    return response.json(dict(post_list=results))

@auth.requires_signature()
def add_reply():

    reply_id = db.reply.insert(
        post_id=request.vars.post_id,
        reply_content=request.vars.reply_content,
        rating0=request.vars.r0,
        rating1=request.vars.r1,
        rating2=request.vars.r2
    )
    # We return the id of the new post, so we can insert it along all the others.
    return response.json(dict(reply_id=reply_id))

@auth.requires_signature()
def edit_reply():
    row = db(db.reply.id == request.vars.reply_id).select().first()
    row.update_record(reply_content=request.vars.reply_content)
    return

def get_reply_list():
    results = []
    if auth.user is None:
        # Not logged in.
        rows = db(db.reply.post_id == request.vars.post_id).select(db.reply.ALL,
                        db.thumb.ALL,
                        left=[
                            db.thumb.on(db.thumb.reply_id == db.reply.id),
                        ],
                        orderby=~db.reply.reply_time)
    else:
        rows = db(db.reply.post_id == request.vars.post_id).select(db.reply.ALL,
                    db.thumb.ALL,
                    left=[
                        db.thumb.on((db.thumb.reply_id == db.reply.id) & (db.thumb.user_email == auth.user.email)),
                    ],
                    orderby=~db.reply.reply_time)
    for row in rows:
        if auth.user is None:
            t = None
        else:
            t = None if row.thumb.id is None else row.thumb.thumb_state
        results.append(dict(
            id=row.reply.id,
            reply_content=row.reply.reply_content,
            reply_author=row.reply.reply_author,
            ratings = [row.reply.rating0, row.reply.rating1, row.reply.rating2],
            thumb = t,
        ))
    return response.json(dict(reply_list=results))

#Code for thumbs
def all_thumbs():
    reply_id = int(request.vars.reply_id)
    #if the user is logged in, search for thumbs by other users, otherwise, search all users
    if auth.user:
        rows = db((db.thumb.reply_id == reply_id) & (db.thumb.user_email != auth.user.email)).select(db.thumb.thumb_state)
    else:
        rows = db(db.thumb.reply_id == reply_id).select(db.thumb.thumb_state)
    thumbs_list = [r.thumb_state for r in rows]
    thumbs_list.sort()
    # For homogeneity, we always return a dictionary.
    return response.json(dict(thumbs=thumbs_list))

@auth.requires_signature()
def thumb_up():
    reply_id = int(request.vars.reply_id)
    thumb_status = request.vars.thumb.lower().startswith('t');
    if thumb_status: state = 'u' 
    else: state = None
    db.thumb.update_or_insert(
            (db.thumb.reply_id == reply_id) & (db.thumb.user_email == auth.user.email),
            reply_id = reply_id,
            user_email = auth.user.email,
            thumb_state = state
        )
    return "ok" # Might be useful in debugging.

@auth.requires_signature()
def thumb_down():
    reply_id = int(request.vars.reply_id)
    thumb_status = request.vars.thumb.lower().startswith('t');
    if thumb_status: state = 'd' 
    else: state = None
    db.thumb.update_or_insert(
            (db.thumb.reply_id == reply_id) & (db.thumb.user_email == auth.user.email),
            reply_id = reply_id,
            user_email = auth.user.email,
            thumb_state = state
        )
    return "ok" # Might be useful in debugging.


#code for stars
def all_stars():
    post_id = int(request.vars.post_id)
    # results = []

    rows = db(db.reply.post_id == post_id).select(db.reply.rating0, db.reply.rating1, db.reply.rating2)
    # for row in rows:
    #     results.append(dict(
    #         ratings = [row.rating0, row.rating1, row.rating2]
    #     ))
    results = [[r.rating0, r.rating1 ,r.rating2] for r in rows]
    # For homogeneity, we always return a dictionary.
    return response.json(dict(stars=results))

def set_stars():
    """Sets the star rating of a post."""
    reply_id = int(request.vars.reply_id)
    rating = int(request.vars.rating)
    rating_idx = int(request.vars.rating_idx)
    if rating_idx == 0:
        db.reply.update_or_insert(
            (db.reply.id == reply_id) & (db.reply.reply_author == auth.user.email),
            reply_id = reply_id,
            user_email = auth.user.email,
            rating0 = rating
        )
    if rating_idx == 1:
        db.reply.update_or_insert(
            (db.reply.id == reply_id) & (db.reply.reply_author == auth.user.email),
            reply_id = reply_id,
            user_email = auth.user.email,
            rating1 = rating
        )
    if rating_idx == 2:
        db.reply.update_or_insert(
            (db.reply.id == reply_id) & (db.reply.reply_author == auth.user.email),
            reply_id = reply_id,
            user_email = auth.user.email,
            rating2 = rating
        )
    
    return "ok" # Might be useful in debugging.
