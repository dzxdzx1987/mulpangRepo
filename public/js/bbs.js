$(function(){

	$.get('template/post_list.html', function(html){
		$.template('list', html);
		getPostList();
	});

	$('#notice_search').submit(function(){
		getPostList($('#notice_search').serialize());
		return false;
	});
});

function getPostList(search) {
	var params = 'cmd=postList';
	if (search) {
		params += '&' + search;
	}
	$.ajax({
		url: 'request',
		data: params,
		dataType: 'json',
		success: function(data){
			if(data.error){
				alert(data.message);
			}else{
				console.log(data);
				var postList = $.tmpl('list', data);
				$('#notice_list').empty().append(postList);
			}
		}
	});
}