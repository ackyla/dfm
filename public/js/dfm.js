$(function(){

		// 欠席者リスト表示
		friend = $(new EJS({
				url: "ejs/friend.ejs"
		}).render());
		$("#friend-container").prepend(friend);

		// フレームリスト表示
		frame = $(new EJS({
				url: "ejs/frame.ejs"
		}).render());
		$("#frame-container").prepend(frame);
		
		// 欠席者追加
		$(".friend-wrapper").click(function(){
				absence = $(new EJS({
          url: "ejs/absence.ejs"
        }).render());
				$("#absence-container").prepend(absence);
				$(".absence-wrapper").draggable();
		});
		
		$("#frame-container").selectable();
});