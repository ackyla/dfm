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

		var $albumContainer = $("#album-item-container");		
		$albumContainer.isotope({
				itemSelector: ".item",
				layoutMode: "fitRows"
		});
		var $photoContainer = $("#photo-item-container");		
		$photoContainer.isotope({
				itemSelector: ".item",
				layoutMode: "fitRows"
		});

		$.getJSON("http://localhost:9393/albums.json", function(json){
				var $photo = $(new EJS({
						url: "ejs/isotope_item.ejs"
				}).render({ items: json }));
				$albumContainer.isotope("insert", $photo);
		});
});

function getPhotos(id) {
		var $albumContainer = $("#album-item-container");
		var $photoContainer = $("#photo-item-container");		

		$albumContainer.hide();
		$photoContainer.show();
		
		if(id == 0){
				$.getJSON("http://localhost:9393/tagged_photos.json", function(json){
						var $photo = $(new EJS({
								url: "ejs/isotope_item.ejs"
						}).render({ items: json }));
						$photoContainer.isotope("insert", $photo);
				});
		}else{
				$.getJSON("http://localhost:9393/photos.json?id="+id, function(json){
						var $photo = $(new EJS({
								url: "ejs/isotope_item.ejs"
						}).render({ items: json }));
						$photoContainer.isotope("insert", $photo);
				});
		}
}

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

function addPhoto(source) {
		photo = $(new EJS({
				url: "ejs/photo.ejs"
		}).render({ source: source }));
		$("#photo-container .photo-wrapper .photo").remove();
		$("#photo-container .photo-wrapper").prepend(photo);
}