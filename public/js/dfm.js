$(function(){

		// isotopeを初期化
		initIsotope();

		// フレームを取得
		getFrames();
		
		// アルバムを取得
		getAlbums();

		// 友達を取得
		getFriends();
});

/**
 * isotopeの初期化
 */
function initIsotope() {
		var $albumContainer = $("#album-item-container");
		var $photoContainer = $("#photo-item-container");
		
		$albumContainer.isotope({
				itemSelector: ".item",
				layoutMode: "fitRows"
		});
		$photoContainer.isotope({
				itemSelector: ".item",
				layoutMode: "fitRows"
		});
}

/**
 * フレームリストを取得する
 */
function getFrames() {
		var $frameContainer = $("#frame-container");
		
		// フレームリスト表示
		frames = $(new EJS({
				url: "ejs/frame.ejs"
		}).render({ shapes: ["square", "oval"] }));

		// フレームリストを挿入
		$frameContainer.prepend(frames);

		$frameContainer.selectable();
}

/**
 * 友達リストの取得する
 */
function getFriends() {
		var $friendContainer = $("#friend-container");

		// 友達リストを取得
		$.getJSON("http://localhost:9393/friends.json", function(json){
				var $friends = $(new EJS({
						url: "ejs/friend.ejs"
				}).render({ friends: json }));

				// 友達リストを挿入
				$friendContainer.append($friends);
		});
}


/**
 * アルバムリストを取得する
 */
function getAlbums() {
		var $albumContainer = $("#album-item-container");

		// アルバムリストを取得
		$.getJSON("http://localhost:9393/albums.json", function(json){
				var $albums = $(new EJS({
						url: "ejs/isotope_item.ejs"
				}).render({ items: json }));

				// isotopeにアルバムリストを挿入
				$albumContainer.isotope("insert", $albums);

				// クリックされた時の動作を設定
				$albums.click(function(){
						if($(this).hasClass("clicked")){
								// 1回クリックされたアルバムは写真リストを取得しない
								showPhotos($(this).attr("data-id"));
						}else{
								// アルバムIDを使用して写真リストを取得する
								$(this).addClass("clicked");
								getPhotos($(this).attr("data-id"));
						}
						return false;
				});
		});
}

function showPhotos(id) {
		var $albumContainer = $("#album-item-container");
		var $photoContainer = $("#photo-item-container");

		$albumContainer.hide();
		$photoContainer.show();

		$photoContainer.isotope({ filter: ".album-"+id });
}

function getPhotos(id) {
		var $photoSelectWrapper = $("#photo-select-wrapper");
		var $albumContainer = $("#album-item-container");
		var $photoContainer = $("#photo-item-container");

		$albumContainer.hide();
		$photoContainer.show();
		$photoContainer.isotope({ filter: ":not(.item)" });
		
		if(id == "0"){
				$.getJSON("http://localhost:9393/tagged_photos.json", function(json){
						var $photo = $(new EJS({
								url: "ejs/isotope_item.ejs"
						}).render({ items: json }));
						$photo.each(function(){
								$(this).addClass("album-"+id);
						});
						$photoContainer.isotope("insert", $photo);
						$photoContainer.isotope({ filter: ".album-"+id });
						$photo.click(function(){
								addPhoto($(this).attr("data-source"));
								$photoSelectWrapper.hide()
								return false;
						});
				});
		}else{
				$.getJSON("http://localhost:9393/photos.json?id="+id, function(json){
						var $photo = $(new EJS({
								url: "ejs/isotope_item.ejs"
						}).render({ items: json }));
						$photo.each(function(){
								$(this).addClass("album-"+id);
						});
						$photoContainer.isotope("insert", $photo);
						$photoContainer.isotope({ filter: ".album-"+id });
						$photo.click(function(){
								addPhoto($(this).attr("data-source"));
								$photoSelectWrapper.hide()
								return false;
						});
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
		$photoWrapper = $("#photo-container .photo-wrapper");
		
		photo = $(new EJS({
				url: "ejs/photo.ejs"
		}).render({ source: source }));
		$photoWrapper.show();
		$("#photo-container .photo-wrapper .photo").remove();
		$("#photo-container .photo-wrapper").prepend(photo);
}