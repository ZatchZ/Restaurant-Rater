# Here go your api methods.
@auth.requires_signature()
def add_profile_picture_url():
    profile_picture_id = db.checklist.insert(
        profile_picture_url=request.vars.profile_picture_url
    )
    logger.info(db().select(db.checklist.ALL))
    return response.json(dict(checklist=dict(
        #id=profile_picture_id,
        profile_picture_url=request.vars.profile_picture_url

    )))
