// This is the js for the default/index.html view.
var app = function() {

    var self = {};
    Vue.config.silent = false; // show all warnings

    // Extends an array
    self.extend = function(a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    // Enumerates an array.
    var enumerate = function(v) { var k=0; return v.map(function(e) {e._idx = k++;});};

    self.add_post = function () {
        // We disable the button, to prevent double submission.
        $.web2py.disableElement($("#add-post"));
        var sent_title = self.vue.form_title; // Makes a copy 
        var sent_content = self.vue.form_content; // 
        $.post(add_post_url,
            // Data we are sending.
            {
                post_title: self.vue.form_title,
                post_content: self.vue.form_content
            },
            // What do we do when the post succeeds?
            function (data) {
                // Re-enable the button.
                $.web2py.enableElement($("#add-post"));
                // Clears the form.
                self.vue.form_title = "";
                self.vue.form_content = "";
                // Adds the post to the list of posts. 
                var new_post = {
                    id: data.post_id,
                    post_title: sent_title,
                    post_content: sent_content
                };
                self.vue.post_list.unshift(new_post);
                // We re-enumerate the array.
                self.get_posts();
                self.process_posts();
                self.vue.show_form = false;
            });
        // If you put code here, it is run BEFORE the call comes back.
    };

    self.get_posts = function() {
        $.getJSON(get_post_list_url,
            function(data) {
                // I am assuming here that the server gives me a nice list
                // of posts, all ready for display.
                self.vue.post_list = data.post_list;
                // Post-processing.
                self.process_posts();
            }
        );
    };

    self.process_posts = function() {
        // This function is used to post-process posts, after the list has been modified
        // or after we have gotten new posts. 
        // We add the _idx attribute to the posts. 
        enumerate(self.vue.post_list);
        self.vue.post_list.map(function (e) {

            //counting the current user's thumbs, if any
            Vue.set(e, '_count', 0);
            if(e.thumb == 'u') e._count++;
            if(e.thumb == 'd') e._count--;

            //counting the amount of thumbs by other users, if any
            $.getJSON(thumb_count_url, {post_id: e.id}, function (data) {
                a = data.thumbs;
                cnt = 0
                for(var i = 0; i < a.length; ++i){
                    if(a[i] == 'u') cnt++;
                    if(a[i] == 'd') cnt--;
                }
                e._count += cnt;
            })

            Vue.set(e, 'editable', (curr_user == e.post_author));
            Vue.set(e, 'editing', false);

            Vue.set(e, 'show_reply', false);
            Vue.set(e, 'replying', false);
            Vue.set(e, 'reply_content', '');
            Vue.set(e, 'reply_list', []);
            
            Vue.set(e, '_tUp', (e.thumb == 'u'));
            Vue.set(e, '_tDown', (e.thumb == 'd'));
            Vue.set(e, '_tUp_black', true);
            Vue.set(e, '_tDown_black', true);
        });
    };

    self.edit_post = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        p.editing = true;
    };

    self.save_edit = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        $.post(edit_post_url,
            {
                post_id: p.id,
                post_title: p.post_title,
                post_content: p.post_content
            },
            function (data) {
                p.editing = false;
            });
    };
    //code for replies
    self.show_reply_toggle = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        p.show_reply = !p.show_reply;
    };
    self.get_replies = function(post_idx) {
        var p = self.vue.post_list[post_idx];
        $.getJSON(get_reply_list_url, {post_id: p.id},
            function(data) {
                p.reply_list = data.reply_list;
                // Post-processing.
                self.process_replies(post_idx);
            }
        );
    };

    self.process_replies = function(post_idx) {
        var p = self.vue.post_list[post_idx];
        enumerate(p.reply_list);
        p.reply_list.map(function (e) {
            Vue.set(e, 'editable', (curr_user == e.reply_author));
            Vue.set(e, 'editing', false);
            // Number of stars to display.
            Vue.set(e, '_arr_num_stars', [e.rating0, e.rating1, e.rating2]);
        });
    };

    self.add_reply = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        $.web2py.disableElement($("#add-reply"));
        var sent_content = p.reply_content; // Makes a copy 
        $.post(add_reply_url,
            {
                post_id: p.id,
                reply_content: p.reply_content
            },
            function (data) {
                $.web2py.enableElement($("#add-post"));
                p.reply_content = "";
                var new_reply = {
                    id: data.reply_id,
                    reply_author: curr_user,
                    reply_content: sent_content
                };
                p.reply_list.unshift(new_reply);
                self.process_replies(post_idx);
                p.replying = false;
            });
    };
    self.edit_reply = function (post_idx, reply_idx) {
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        r.editing = true;
    };
    self.save_reply_edit = function (post_idx, reply_idx) {
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        $.post(edit_reply_url,
            {
                reply_id: r.id,
                reply_content: r.reply_content
            },
            function (data) {
                r.editing = false;
            });
    };
    // Code for star ratings.
    self.stars_out = function (post_idx, reply_idx) {
        // Out of the star rating; set number of visible back to rating.
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];

        r._arr_num_stars[0] = r.rating0;
        r._arr_num_stars[1] = r.rating1;
        r._arr_num_stars[2] = r.rating2;
    };

    self.stars_over = function(post_idx, reply_idx, arr_idx, star_idx) {
        //console.log(post_idx, reply_idx, arr_idx, star_idx)
        // Hovering over a star; we show that as the number of active stars.
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        r._arr_num_stars[arr_idx] = star_idx;
    };

    self.set_stars = function(post_idx, reply_idx, arr_idx, star_idx) {
        // The user has set this as the number of stars for the post.
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        r._arr_num_stars[arr_idx] = star_idx;
        // Sends the rating to the server.
        $.post(set_stars_url, {
            reply_id: r.id,
            rating_idx: arr_idx,
            rating: star_idx
        });
    };

    // code for thumbs
    self.thumbUp_mouseover = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        p._tUp = true;
        p._tDown = false;

        p._tUp_black = (p.thumb == 'u');
        p._tDown_black = (p.thumb == 'd');
    };
    self.thumbUp_mouseout = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        p._tUp = (p.thumb == 'u');
        p._tDown = (p.thumb == 'd');
        

        p._tUp_black = true;
        p._tDown_black = true;
    };
    self.thumbDown_mouseover = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        p._tUp = false;
        p._tDown = true;

        p._tUp_black = (p.thumb == 'u');
        p._tDown_black = (p.thumb == 'd');
    };
    self.thumbDown_mouseout = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        p._tUp = (p.thumb == 'u');
        p._tDown = (p.thumb == 'd');
        
        p._tUp_black = true;
        p._tDown_black = true;
    };
    self.thumbUp_click = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        if(p.thumb == 'u'){
           t = false; 
           p.thumb = null
           p._count--;
        } 
        else {
            t = true;
            p.thumb = 'u'
            p._count++;
        }
        // We need to post back the change to the server.
        $.post(thumb_up_url, {
            post_id: p.id,
            thumb: t
        });
        p._tUp_black = (p.thumb == 'u');
        p._tDown_black = (p.thumb == 'd');
    };
    self.thumbDown_click = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        if(p.thumb == 'd'){
           t = false; 
           p.thumb = null
           p._count++;
        } 
        else {
            t = true;
            p.thumb = 'd'
            p._count--;
        }
        // We need to post back the change to the server.
        $.post(thumb_down_url, {
            post_id: p.id,
            thumb: t
        });
        p._tUp_black = (p.thumb == 'u');
        p._tDown_black = (p.thumb == 'd');
    };

    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            form_title: "",
            form_content: "",
            post_list: [],
            show_form: false,
            star_indices: [1, 2, 3, 4, 5],
            rating_strings: ["I forgot", "The rating", "Criterias"]
        },
        methods: {
            // posts
            add_post: self.add_post,
            edit_post: self.edit_post,
            save_edit: self.save_edit,
            // replies
            show_reply_toggle: self.show_reply_toggle,
            get_replies: self.get_replies,
            add_reply: self.add_reply,
            edit_reply: self.edit_reply,
            save_reply_edit: self.save_reply_edit,
            // Star ratings.
            stars_out: self.stars_out,
            stars_over: self.stars_over,
            set_stars: self.set_stars,
            //thumbs
            thumbUp_mouseover: self.thumbUp_mouseover,
            thumbUp_mouseout: self.thumbUp_mouseout,
            thumbDown_mouseover: self.thumbDown_mouseover,
            thumbDown_mouseout: self.thumbDown_mouseout,
            thumbUp_click: self.thumbUp_click,
            thumbDown_click: self.thumbDown_click
        }

    });

    // If we are logged in, shows the form to add posts.
    if (is_logged_in) {
        $("#add_post").show();
    }

    // Gets the posts.
    self.get_posts();

    return self;
};

var APP = null;

// No, this would evaluate it too soon.
// var APP = app();

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
