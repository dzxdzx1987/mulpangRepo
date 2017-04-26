$(function(){
    $('#post_form').submit(addNewPost);
});

// add a new post
function addNewPost(){
	if($('#post_title').val() == '' || $('#post_title').val() == undefined){
		alert('please enter the title of the post');
        return false;
	}
    if($('#post_content').val() == '' || $('#post_content').val() == undefined) {
        alert('please enter the content of the post');
        return false;
    }else{
		$.ajax({
			url: 'request',
			data: $(this).serialize(),
			dataType: 'json',
			success: function(data){
				if(data.error){
					alert(data.message);
				}else{
					alert('add a new post!');
					window.location.href = "bbs.html";
				}
			}
		});
	}
	return false;
}