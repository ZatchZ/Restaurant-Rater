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
        err_flag = false
        if(self.vue.form_title == ""){
            self.vue.title_empty = true;
            err_flag = true;
        }
        else self.vue.title_empty = false;
        if(self.vue.form_content == ""){
            self.vue.cont_empty = true;
            err_flag = true;
        }
        else self.vue.cont_empty = false;
        if(err_flag) return;
        // We disable the button, to prevent double submission.
        $.web2py.disableElement($("#add-post"));
        var sent_title = self.vue.form_title; // Makes a copy 
        var sent_content = self.vue.form_content; // 
        var sent_category = self.vue.form_category; // 
        $.post(add_post_url,
            // Data we are sending.
            {
                post_title: self.vue.form_title,
                post_content: self.vue.form_content,
                post_category: self.vue.form_category,
            },
            // What do we do when the post succeeds?
            function (data) {
                // Re-enable the button.
                $.web2py.enableElement($("#add-post"));
                // Clears the form.
                self.vue.form_title = "";
                self.vue.form_content = "";
                self.vue.form_category = "";
                // Adds the post to the list of posts. 
                var new_post = {
                    id: data.post_id,
                    post_title: sent_title,
                    post_content: sent_content,
                    post_category: sent_category
                };
                self.vue.post_list.unshift(new_post);
                // We re-enumerate the array.
                self.get_posts();
                self.vue.show_form = false;
            });
        // If you put code here, it is run BEFORE the call comes back.
    };

    self.get_posts = function(filter = "", search = "") {
        $.getJSON(get_post_list_url, {post_category: filter, search_term: search},
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
            //editing
            Vue.set(e, 'editable', (curr_user == e.post_author));
            Vue.set(e, 'editing', false);
            Vue.set(e, 'title_empty', false);
            Vue.set(e, 'cont_empty', false);
            //replies
            Vue.set(e, 'show_reply', false);
            Vue.set(e, 'replying', false);
            Vue.set(e, 'reply_content', '');
            Vue.set(e, 'reply_empty', false);
            Vue.set(e, 'reply_ratings', [0,0,0]);
            Vue.set(e, '_display_ratings', [0,0,0]);
            Vue.set(e, 'reply_list', []);
            //stars
            Vue.set(e, 'avg_ratings', [0,0,0]);
            self.avg_post_stars(e);

        });
    };
    self.avg_post_stars = function (p) {
        $.getJSON(get_all_stars_url, {post_id: p.id}, function (data) {
            p.avg_ratings = [0,0,0];
            a = data.stars;
            len = a.length;
            for(var i = 0; i < len; ++i){
                for (var k in a[i]){
                    p.avg_ratings[k] += a[i][k];
                }
            }
            for(var j = 0; j < p.avg_ratings.length; ++j){
                p.avg_ratings[j] /= len;
                if(isNaN(p.avg_ratings[j])) p.avg_ratings[j] = 0;
            }
        })
    }
    self.edit_post = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        p.editing = true;
    };

    self.save_edit = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        err_flag = false
        if(p.post_title == ""){
            p.title_empty = true;
            err_flag = true;
        }
        else p.title_empty = false;
        if(p.post_content == ""){
            p.cont_empty = true;
            err_flag = true;
        }
        else p.cont_empty = false;
        if(err_flag) return;
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
            Vue.set(e, 'edit_empty', false);

            // Number of stars to display.
            Vue.set(e, '_arr_num_stars', e.ratings);

            // thumbs stuff
            //counting the current user's thumbs, if any
            Vue.set(e, '_countU', 0);
            Vue.set(e, '_countD', 0);
            if(e.thumb == 'u') e._countU++;
            if(e.thumb == 'd') e._countD++;
            //counting the amount of thumbs by other users, if any
            $.getJSON(thumb_count_url, {reply_id: e.id}, function (data) {
                a = data.thumbs;
                for(var i = 0; i < a.length; ++i){
                    if(a[i] == 'u') e._countU++;
                    if(a[i] == 'd') e._countD++;
                }
            })
            Vue.set(e, '_tUp', (e.thumb == 'u'));
            Vue.set(e, '_tDown', (e.thumb == 'd'));
            Vue.set(e, '_tUp_black', true);
            Vue.set(e, '_tDown_black', true);
        });
    };

    self.add_reply = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        if(p.reply_content == ""){
            p.reply_empty = true;
            return
        }
        else p.reply_empty = false;
        $.web2py.disableElement($("#add-reply"));
        var sent_content = p.reply_content; // Makes a copy 
        var sent_ratings = p.reply_ratings;
        $.post(add_reply_url,
            {
                post_id: p.id,
                reply_content: p.reply_content,
                r0: p.reply_ratings[0],
                r1: p.reply_ratings[1],
                r2: p.reply_ratings[2]
            },
            function (data) {
                $.web2py.enableElement($("#add-reply"));
                p.reply_content = "";
                p._display_ratings = [0,0,0];
                p.reply_ratings = [0,0,0];
                var new_reply = {
                    id: data.reply_id,
                    reply_author: curr_user,
                    reply_content: sent_content,
                    ratings: sent_ratings
                };
                p.reply_list.unshift(new_reply);
                self.get_replies(post_idx);
                self.avg_post_stars(p)
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
        if (r.reply_content == ""){
            r.edit_empty = true;
            return;
        }
        else r.edit_empty = false;
        $.post(edit_reply_url,
            {
                reply_id: r.id,
                reply_content: r.reply_content
            },
            function (data) {
                self.avg_post_stars(p)
                r.editing = false;
            });
    };
    // Code for creating stars on new replies.
    // We probably don't need redundant code if someone wants to optimize this
    self.new_reply_stars_out = function (post_idx) {
        // Out of the star rating; set number of visible back to rating.
        var p = self.vue.post_list[post_idx];
        p._display_ratings = p.reply_ratings;
    };

    self.new_reply_stars_over = function(post_idx, arr_idx, star_idx) {
        // Hovering over a star; we show that as the number of active stars.
        var p = self.vue.post_list[post_idx];
        //workaround for stars not updating
        var temp_arr = [1,1,1]
        for (i in p.reply_ratings){
            temp_arr[i] = p.reply_ratings[i]
        }
        temp_arr[arr_idx] = star_idx;
        p._display_ratings = temp_arr;
    };

    self.new_reply_set_stars = function(post_idx, arr_idx, star_idx) {
        // The user has set this as the number of stars for the post.
        var p = self.vue.post_list[post_idx];
        p._display_ratings[arr_idx] = star_idx;
        p.reply_ratings[arr_idx] = star_idx;
    };

    // Code for star ratings on existing replies.
    self.stars_out = function (post_idx, reply_idx) {
        // Out of the star rating; set number of visible back to rating.
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        r._arr_num_stars = r.ratings;
    };

    self.stars_over = function(post_idx, reply_idx, arr_idx, star_idx) {
        // Hovering over a star; we show that as the number of active stars.
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        if (!r.editing) return;
        //workaround for stars not updating
        var temp_arr = [1,1,1]
        for (i in r.ratings){
            temp_arr[i] = r.ratings[i]
        }
        temp_arr[arr_idx] = star_idx;
        r._arr_num_stars = temp_arr;
    };

    self.set_stars = function(post_idx, reply_idx, arr_idx, star_idx) {
        // The user has set this as the number of stars for the post.
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        if (!r.editing) return;
        r._arr_num_stars[arr_idx] = star_idx;
        r.ratings[arr_idx] = star_idx;
        // Sends the rating to the server.
        $.post(set_stars_url, {
            reply_id: r.id,
            rating_idx: arr_idx,
            rating: star_idx
        });
    };

    // code for thumbs
    self.thumbUp_mouseover = function (post_idx, reply_idx) {
        if (!is_logged_in) return;
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        r._tUp = true;
        r._tDown = false;

        r._tUp_black = (r.thumb == 'u');
        r._tDown_black = (r.thumb == 'd');
    };
    self.thumbUp_mouseout = function (post_idx, reply_idx) {
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        r._tUp = (r.thumb == 'u');
        r._tDown = (r.thumb == 'd');
        

        r._tUp_black = true;
        r._tDown_black = true;
    };
    self.thumbDown_mouseover = function (post_idx, reply_idx) {
        if (!is_logged_in) return;
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        r._tUp = false;
        r._tDown = true;

        r._tUp_black = (r.thumb == 'u');
        r._tDown_black = (r.thumb == 'd');
    };
    self.thumbDown_mouseout = function (post_idx, reply_idx) {
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        r._tUp = (r.thumb == 'u');
        r._tDown = (r.thumb == 'd');
        
        r._tUp_black = true;
        r._tDown_black = true;
    };
    self.thumbUp_click = function (post_idx, reply_idx) {
        if (!is_logged_in) return;
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        if(r.thumb == 'u'){
           t = false; 
           r.thumb = null
           r._countU--;
        } 
        else{
            if(r.thumb == 'd')r._countD--;
            t = true;
            r.thumb = 'u'
            r._countU++;
        }
        // We need to post back the change to the server.
        $.post(thumb_up_url, {
            reply_id: r.id,
            thumb: t
        });
        r._tUp_black = (r.thumb == 'u');
        r._tDown_black = (r.thumb == 'd');
    };
    self.thumbDown_click = function (post_idx, reply_idx) {
        if (!is_logged_in) return;
        var p = self.vue.post_list[post_idx];
        var r = p.reply_list[reply_idx];
        if(r.thumb == 'd'){
           t = false; 
           r.thumb = null
           r._countD--;
        } 
        else {
            if(r.thumb == 'u')r._countU--;
            t = true;
            r.thumb = 'd'
            r._countD++;
        }
        // We need to post back the change to the server.
        $.post(thumb_down_url, {
            reply_id: r.id,
            thumb: t
        });
        r._tUp_black = (r.thumb == 'u');
        r._tDown_black = (r.thumb == 'd');
    };

    //code for page states
    self.set_page_state = function (state){
        //In case you need to run special code for changing states, put it here
        switch (state){
            case "posts": 
                self.get_posts(self.vue.post_filter, self.vue.search_term);
                break;
            case "market": //nothing special
                break; 
        }
        if(state != "posts"){
            self.vue.show_form = false;
            self.vue.post_filter = "";
        }
        self.vue.page_state = state;
    }
    self.start_posting = function (category){
        if(!is_logged_in){
            window.location.href = login_url;
            return;
        }
        self.vue.show_form = true;
        self.vue.post_filter = category;
        self.vue.form_category = category;
        self.set_page_state("posts");
    }
    self.start_search = function (){
        self.set_page_state("posts");
    }
    
    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            //posting
            form_title: "",
            title_empty: false,
            form_content: "",
            cont_empty: false,
            form_category: "",
            show_form: false,
            //list of posts
            post_list: [],
            star_indices: [1, 2, 3, 4, 5],
            rating_strings: ["long word placeholder", "Rating", "yes"],
            post_filter: "",
            //page misc
            page_state: "market",
            searching:false,
            search_term: "",
        },
        methods: {
            // page states
            set_page_state: self.set_page_state,
            start_posting: self.start_posting,
            start_search: self.start_search,
            // posts
            add_post: self.add_post,
            get_posts: self.get_posts,
            edit_post: self.edit_post,
            save_edit: self.save_edit,
            // replies
            show_reply_toggle: self.show_reply_toggle,
            get_replies: self.get_replies,
            add_reply: self.add_reply,
            edit_reply: self.edit_reply,
            save_reply_edit: self.save_reply_edit,
            new_reply_stars_out: self.new_reply_stars_out,
            new_reply_stars_over: self.new_reply_stars_over,
            new_reply_set_stars: self.new_reply_set_stars,
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
    return self;
};

var APP = null;

// No, this would evaluate it too soon.
// var APP = app();

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
