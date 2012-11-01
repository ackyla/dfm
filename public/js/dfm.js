$(function(){

		// 欠席者リスト表示
		$.getJSON("http://localhost:9393/friends.json", function(json){
				friend = $(new EJS({
						url: "ejs/friend.ejs"
				}).render({ friends: json }));
				$("#friend-container").append(friend);
		});
		
		// フレームリスト表示
		frame = $(new EJS({
				url: "ejs/frame.ejs"
		}).render({ shapes: ["square", "oval", "square", "square", "square", "oval", "oval"] }));
		$("#frame-container").prepend(frame);
		
		$("#frame-container").selectable();

});

function addAbsence(url) {
		// 欠席者追加
		absence = $(new EJS({
        url: "ejs/absence.ejs"
    }).render({ picture: url }));
		$("#absence-container").prepend(absence);
		$(".absence-wrapper").draggable({
				drag: function(){
						$(this).find("input.position-x").val($(this).css("left"));
						$(this).find("input.position-y").val($(this).css("top"));
				}
		});
}