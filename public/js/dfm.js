$(function(){
		$(".friend-wrapper").click(function(){
				$("#absence-container").prepend("<div class='absence-wrapper' style='position: absolute; top: 5px; left: 5px;'><img src='img/frame_picture.jpg' class='square' style='width: 100px; height: 130px;' /><div class='controll-wrapper' style='position: absolute;top: 0px;left: 0px;'><span style='font-size: 20px;font-weight: bold;background: whitesmoke;border-radius: 10px;width: 20px;height: 20px;position: absolute;text-align: center;line-height: 15px;'><a href='#' style='text-decoration: none;' onclick='$(this).closest(\".absence-wrapper\").remove(); return false;'>×</a></span></div></div>");
				$(".absence-wrapper").draggable();
				//$(".absence-wrapper").click(function(){
				//		$(this).remove();
				//});
		});
		
		$("#frame-container").selectable();

});