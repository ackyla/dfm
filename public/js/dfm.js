$(function(){

		// isotopeを初期化
		initIsotope();

		// フレームを取得
		//getFrames();
		
		// アルバムを取得
		getAlbums();

		// 友達を取得
		getFriends();
});

/**
 * isotopeの初期化
 */
function initIsotope() {
		var $friendContainer = $("#friend-item-container");
		var $albumContainer = $("#album-item-container");
		var $photoContainer = $("#photo-item-container");

		$friendContainer.isotope({
				itemSelector: ".item",
				layoutMode: "straightDown"
		});
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
 
function getFrames() {
		var $frameContainer = $("#frame-container");
		
		// フレームリスト表示
		var $frames = $(new EJS({
				url: "ejs/frame.ejs"
		}).render({ shapes: ["square", "oval"] }));

		// フレームリストを挿入
		$frameContainer.prepend($frames);

		$frameContainer.selectable();

		// クリックした時の動作
		$frames.click(function(){
				var $absenceImageWrapper = $(".absence-image-wrapper");
				$absenceImageWrapper.removeClass("square oval")
				$absenceImageWrapper.addClass($(this).attr("frame-type"));

				return false;
		});
}*/

/**
 * 友達リストを取得する
 */
function getFriends() {
		var $friendContainer = $("#friend-item-container");

		// 友達リストを取得
		$.getJSON("http://localhost:9393/friends.json", function(json){
				var $friends = $(new EJS({
						url: "ejs/friend.ejs"
				}).render({ friends: json }));

				// isotopeに友達リストを挿入
				$friendContainer.isotope("insert", $friends);

				// フィルター
				$friendContainer.isotope({ filter: '.active' });
				
				initFriendsOrder();
				
				// クリックした時の動作
				$friends.click(function(){
						var id = $(this).attr("data-id");
						// フィルター
						$friendContainer.isotope({ filter: '.active' });
						addAbsence(id);
						getMutualFriends(id);
						return false;
				});
		});
}

/**
 * 共通の友達ソートを初期化する
 */
function initFriendsOrder() {
		var $friendContainer = $("#friend-item-container");
		var $friends = $friendContainer.find(".item");

		$friends.each(function(){
				$(this).attr("data-closely", 9999);
		});

		sortFriends();
}

/**
 * 共通の友達ソートをリセットする
 */
function resetFriendsOrder() {
		initFriendsOrder();
		
		var tags = $("#photo-inner").find("[name='tags[]']").map(function(){ return $(this).val(); }).toArray();
		for(i = 0; i < tags.length; i ++){
				var tag = tags[i];
				var remain = tags.slice(undefined, i).concat(tags.slice(i+1, undefined));

				$.ajax(
						{
								url: "closely.json",
								type: "POST",
								data: {
										id: tag,
										absences: new Array(),
										tags: remain
								},
								success: function(json){
										$.each(json, function(key, val){
												changeClosely(key, val);
										});
										sortFriends();
								},
								dataType: "json"
						}
				);
		}
}

/**
 * 友達リストを共通の友達が多い順にソートする
 */
function sortFriends() {
		var $friendContainer = $("#friend-item-container");
		var $friends = $friendContainer.find(".item");

		// ソートデータを更新する
		$friendContainer.isotope({
				getSortData : {
						closely : function($elem){
								return $elem.attr("data-closely");
						}
				}
		});
		$friendContainer.isotope("updateSortData", $friends);
		
		$friendContainer.isotope({
				sortBy : "closely",
				sortAscending : true
		});
}

/**
 * 共通の友達を取得する
 */
function getMutualFriends(id) {
		var absences = $(".absence-wrapper").map(function(){ return $(this).attr("data-id"); }).toArray();
		var tags = $("#photo-inner").find("[name='tags[]']").map(function(){ return $(this).val(); }).toArray();
		
		$.ajax(
				{
						url: "closely.json",
						type: "POST",
						data: {
								id: id,
								absences: absences,
								tags: tags
						},
						success: function(json){
								$.each(json, function(key, val){
										changeClosely(key, val);
								});
								sortFriends();
						},
						dataType: "json"
				}
		);
}

/**
 * 繋がりの値を更新する
 */
function changeClosely(id, closely) {
		$friend = $("#friend-item-container [data-id="+id+"]");
		$friend.attr("data-closely", parseInt($friend.attr("data-closely"))-closely);
}

/**
 * アルバムを表示する
 */
function showAlbums() {
		$("#loading-photos").hide();
		$('#photo-select-wrapper').show();
		$('#album-item-container').show();
		$('#album-item-container').isotope('reLayout');
		$('#photo-item-container').hide();
		$('#photo-wrapper').hide();
		
		return false;
}

/**
 * アルバムリストを取得する
 */
function getAlbums() {
		var $albumContainer = $("#album-item-container");

		// ローディングアニメーション表示
		$("#loading-albums").show();

		// アルバムリストを取得
		$.getJSON("http://localhost:9393/albums.json", function(json){
				var $albums = $(new EJS({
						url: "ejs/isotope_item.ejs"
				}).render({ items: json }));

				// ローディングアニメーション消去
				$("#loading-albums").hide();
				
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

/**
 * 写真を表示する
 */
function showPhotos(id) {
		var $albumContainer = $("#album-item-container");
		var $photoContainer = $("#photo-item-container");

		$albumContainer.hide();
		$photoContainer.show();

		$photoContainer.isotope({ filter: ".album-"+id });
}

/**
 * 写真を取得する
 */
function getPhotos(id) {
		var $photoSelectWrapper = $("#photo-select-wrapper");
		var $albumContainer = $("#album-item-container");
		var $photoContainer = $("#photo-item-container");

		$albumContainer.hide();
		$photoContainer.show();
		$photoContainer.isotope({ filter: ":not(.item)" });

		// ローディングアニメーション表示
		$("#loading-photos").show();
		
		if(id == "0"){
				$.getJSON("http://localhost:9393/tagged_photos.json", function(json){
						var $photo = $(new EJS({
								url: "ejs/isotope_item.ejs"
						}).render({ items: json }));
						$photo.each(function(){
								$(this).addClass("album-"+id);
						});

						// ローディングアニメーション消去
						$("#loading-photos").hide();
						
						$photoContainer.isotope("insert", $photo);
						$photoContainer.isotope({ filter: ".album-"+id });
						$photo.click(function(){
								addPhoto($(this).attr("data-source"), $(this).find("[name='tags[]']").map(function(){ return $(this).val(); }));
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

						// ローディングアニメーション消去
						$("#loading-photos").hide();
						
						$photoContainer.isotope("insert", $photo);
						$photoContainer.isotope({ filter: ".album-"+id });
						$photo.click(function(){
								addPhoto($(this).attr("data-source"), $(this).find("[name='tags[]']").map(function(){ return $(this).val(); }));
								$photoSelectWrapper.hide()
								return false;
						});
				});
		}
}

/**
 * 欠席者を追加する
 */
function addAbsence(id) {
		// 欠席者の写真を取得
		$.getJSON("http://localhost:9393/absence.json?id="+id, function(json){
				// 欠席者追加
				var $absence = $(new EJS({
						url: "ejs/absence.ejs"
				}).render({ picture: json["source"], id: id }));
				$("#absence-container").prepend($absence);

				// ドラッガブル
				$absence.draggable({
						drag: function(){
								$(this).find("input.position-x").val($(this).css("left"));
								$(this).find("input.position-y").val($(this).css("top"));
						}
				});

				// セレクト(仮)
				$absence.find(".absence-image-wrapper").click(function(){
						$(this).toggleClass('selected');
				});

				// 閉じる
				$absence.find(".close-button").click(function(){
						$(this).closest('.absence-wrapper').remove();
						return false;
				});
		});
}

/**
 * 写真を追加する
 */
function addPhoto(source, tags) {
		var $photoWrapper = $("#photo-wrapper");
		
		var $photo = $(new EJS({
				url: "ejs/photo.ejs"
		}).render({ source: source, tags: tags }));
		$photoWrapper.show();
		$("#photo-inner").remove();
		$photoWrapper.prepend($photo);

		resetFriendsOrder();
}
/**
 * 写真を作る
 */
function createPhoto(){
		var photo = $("#photo-container [name='photo']").val();
		var src = $("#photo-container [name='absence[src][]']").map(function(){ return $(this).val(); }).toArray();
		var x = $("#photo-container [name='absence[x][]']").map(function(){ return $(this).val(); }).toArray();
		var y = $("#photo-container [name='absence[y][]']").map(function(){ return $(this).val(); }).toArray();

		var absence = {src: src, x: x, y: y};
		
		$.post("http://localhost:9393/create",
					 {
							 photo: photo,
							 absence: absence
					 },
					 function(json){
							 showResult(json);
					 }
		);
}

/**
 * 生成結果を表示する
 */
function showResult(json) {
		var $modalContainer = $("#modal-container");		
		var $result = $(new EJS({
				url: "ejs/result.ejs"
		}).render({ source: json['path'], tags: json['tags'] }));
		
		$modalContainer.empty();
		$modalContainer.prepend($result);
		$result.modal("show");
}