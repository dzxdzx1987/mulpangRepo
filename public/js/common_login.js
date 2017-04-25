$(function(){
	$('#login').submit(function(){
		$.ajax({
			url: 'login',
			dataType: 'json',
			data: $(this).serialize(),
			type: 'post',
			success: function(result){
				if(result.error){
					alert(result.message);
				}else{
					alert('로그인 되었습니다.');
					window.location.reload();
				}
			}
		});
		return false;
	});
});