$(function(){

		// 欠席者リスト表示
		friend = $(new EJS({
				url: "ejs/friend.ejs"
		}).render());
		$("#friend-container").prepend(friend);

		// フレームリスト表示
		frame = $(new EJS({
				url: "ejs/frame.ejs"
		}).render({ shapes: ["square", "oval", "square", "square", "square", "oval", "oval"] }));
		$("#frame-container").prepend(frame);
		
		// 欠席者追加
		$(".friend-wrapper").click(function(){
				absence = $(new EJS({
          url: "ejs/absence.ejs"
        }).render());
				$("#absence-container").prepend(absence);
				$(".absence-wrapper").draggable({
						drag: function(){
								$(this).find("input.position-x").val($(this).css("left"));
								$(this).find("input.position-y").val($(this).css("top"));
						}
				});
		});
		
		$("#frame-container").selectable();
});