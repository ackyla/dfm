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
		$.getJSON("friends.json", function(json){
				var $friends = $(new EJS({
						url: "ejs/friend.ejs"
				}).render({ friends: json }));

				// isotopeに友達リストを挿入
				$friendContainer.isotope("insert", $friends);

				// 友達リストの並びを初期化
				initFriendsOrder();
				
				// クリックした時の動作
				$friends.click(function(){
						var id = $(this).attr("data-id");
						hideFriend(id);
						addAbsentee(id);
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
				$(this).addClass("active");
		});

		sortFriends();
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
		$.getJSON("albums.json", function(json){
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
		var $albumContainer = $("#album-item-container");
		var $photoContainer = $("#photo-item-container");

		$albumContainer.hide();
		$photoContainer.show();
		$photoContainer.isotope({ filter: ":not(.item)" });

		// ローディングアニメーション表示
		$("#loading-photos").show();
		
		if(id == "0"){
				$.getJSON("tagged_photos.json", function(json){
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
								// 写真を表示
								addPhoto($(this));
								return false;
						});
				});
		}else{
				$.getJSON("photos.json?id="+id, function(json){
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
								// 写真を表示
								addPhoto($(this));
								return false;
						});
				});
		}
}

/**
 * 繋がりを遠くする
 */
function updateClosely(id, absentees, attendees, operator) {
		$.ajax(
				{
						url: "closely.json",
						type: "POST",
						data: {
								id: id,
								absences: absentees,
								tags: attendees
						},
						success: function(json){
								$.each(json, function(key, val){
										$friend = $("#friend-item-container [data-id="+key+"]");
										$friend.attr("data-closely", parseInt($friend.attr("data-closely"))+(operator*val));
								});
								sortFriends();
						},
						dataType: "json"
				}
		);
}

/**
 * 出席者を追加する
 */
function addAttendee(id) {
		var $photoInner = $("#photo-inner");
		var $attendee = $("<input type='hidden' name='tags[]' value="+id+" />");
		var absentees = $(".absence-wrapper").map(function(){ return $(this).attr("data-id"); }).toArray();
		var attendees = $("#photo-inner").find("[name='tags[]']").map(function(){ return $(this).val(); }).toArray();

		// ajax
		updateClosely(id, absentees, attendees, -1);

		hideFriend(id);
		$photoInner.prepend($attendee);
}

/**
 * 欠席者を追加する
 */
function addAbsentee(id) {
		// 欠席者の写真を取得
		$.getJSON("absence.json?id="+id, function(json){
				// 欠席者取得
				var $absence = $(new EJS({
						url: "ejs/absence.ejs"
				}).render({ picture: json["source"], id: id }));
				var absentees = $(".absence-wrapper").map(function(){ return $(this).attr("data-id"); }).toArray();
				var attendees = $("#photo-inner").find("[name='tags[]']").map(function(){ return $(this).val(); }).toArray();

				// ajax
				updateClosely(id, absentees, attendees, -1);

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
						showFriend(id);
						removeAbsentee($(this).closest(".absence-wrapper").attr("data-id"));
						return false;
				});
		});
}

/**
 * 欠席者を削除する
 */
function removeAbsentee(id) {

		$("[data-id="+id+"].absence-wrapper").remove();

		var absentees = $(".absence-wrapper").map(function(){ return $(this).attr("data-id"); }).toArray();
		var attendees = $("#photo-inner").find("[name='tags[]']").map(function(){ return $(this).val(); }).toArray();

		// ajax
		updateClosely(id, absentees, attendees, 1);
}

/**
 * 友達を表示する
 */
function showFriend(id) {
		var $friendItemContainer = $("#friend-item-container")

		$friendItemContainer.find("[data-id="+id+"]").addClass("active");
		$friendItemContainer.isotope({ filter: '.active' });
}

/**
 * 友達を非表示にする
 */
function hideFriend(id) {
		var $friendItemContainer = $("#friend-item-container")

		$friendItemContainer.find("[data-id="+id+"]").removeClass("active");
		$friendItemContainer.isotope({ filter: '.active' });
}

/**
 * 写真を追加する
 */
function addPhoto($item) {
		var id = $item.attr("data-id");
		
		$.ajax(
				{
						url: "photo.json",
						type: "POST",
						data: {
								id: id,
						},
						success: function(json){
								var $photoWrapper = $("#photo-wrapper");

								var $photo = $(new EJS({
										url: "ejs/photo.ejs"
								}).render({ source: json["source"], width: json["width"] }));

								// 欠席者を削除
								$(".absence-wrapper").each(function(){
										removeAbsentee($(this).attr("data-id"));
								});

								// 友達リストの並びを初期化
								initFriendsOrder();

								// 写真を追加
								$photoWrapper.show();
								$("#photo-inner").remove();
								$photoWrapper.prepend($photo);

								// 出席者を追加
								$item.find("[name='tags[]']").each(function(){
										addAttendee($(this).val());
								});

								// 写真リストを隠す
								$("#photo-select-wrapper").hide();
						},
						dataType: "json"
				}
		);
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
		
		$.post("create",
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