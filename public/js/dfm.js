var csrf_token;

$(function(){

		window.csrf_token = $("[name='_csrf']").val();

		$.ajaxSetup({
				error: function(XMLHttpRequest, textStatus, errorThrown){
						$("#communication-error-message").show();
				}
		});
		
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

		// ローディングアニメーション表示
		$("#loading-friends").show();
		
		// 友達リストを取得
		$.ajax({
				url: "friends.json",
				type: "POST",
				dataType: "json",
				data: {
						_csrf: window.csrf_token
				},
				success: function(json){
						var $friends = $(new EJS({
								url: "ejs/friend.ejs"
						}).render({ friends: json }));
						
						// ローディングアニメーション消去
						$("#loading-friends").hide();
						
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
				}
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
		// ナビメッセージを変更
		$("#navi-message").text("アルバムを選択");
		$("#return-button").attr("disabled", "disabled");
		$("#create-button").attr("disabled", "disabled");
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
		$.ajax({
				url: "albums.json",
				type: "POST",
				dataType: "json",
				data: {
						_csrf: window.csrf_token
				},
				success: function(json){
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
										// 戻るボタンを有効化
								$("#return-button").removeAttr("disabled");
								}else{
										// アルバムIDを使用して写真リストを取得する
										$(this).addClass("clicked");
										getPhotos($(this).attr("data-id"));
								}
								return false;
						});
				}
		});
}

/**
 * 写真を表示する
 */
function showPhotos(id) {
		var $albumContainer = $("#album-item-container");
		var $photoContainer = $("#photo-item-container");

		// ナビメッセージを変更
		$("#navi-message").text("写真を選択");
		
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

		// ナビメッセージを変更
		$("#navi-message").text("写真を選択");
		
		$albumContainer.hide();
		$photoContainer.show();
		$photoContainer.isotope({ filter: ":not(.item)" });
		
		// ローディングアニメーション表示
		$("#loading-photos").show();
		
		if(id == "0"){
				$.ajax({
						url: "tagged_photos.json",
						type: "POST",
						dataType: "json",
						data: {
								_csrf: window.csrf_token
						},
						success: function(json){
								var $photo = $(new EJS({
										url: "ejs/isotope_item.ejs"
								}).render({ items: json }));
								$photo.each(function(){
										$(this).addClass("album-"+id);
								});
								
								// 戻るボタンを有効化
								$("#return-button").removeAttr("disabled");
								
								// ローディングアニメーション消去
								$("#loading-photos").hide();
								
								$photoContainer.isotope("insert", $photo);
								$photoContainer.isotope({ filter: ".album-"+id });
								$photo.click(function(){
										// 写真を表示
								getPhoto($(this));
										return false;
								});
						}
				});
		}else{
				$.ajax({
						url: "photos.json",
						type: "POST",
						dataType: "json",
						data: {
								_csrf: window.csrf_token,
								id: id
						},
						success: function(json){
								var $photo = $(new EJS({
										url: "ejs/isotope_item.ejs"
								}).render({ items: json }));
								$photo.each(function(){
										$(this).addClass("album-"+id);
								});
								
								// 戻るボタンを有効化
								$("#return-button").removeAttr("disabled");
								
								// ローディングアニメーション消去
								$("#loading-photos").hide();
								
								$photoContainer.isotope("insert", $photo);
								$photoContainer.isotope({ filter: ".album-"+id });
								$photo.click(function(){
										// 写真を表示
								getPhoto($(this));
										return false;
								});
						}
				});
		}
}

/**
 * 繋がりを計算する
 */
function updateClosely(id, absentees, attendees, operator) {

		// ソーティングアニメーションを表示
		$("#sorting-friends").show();
		
		$.ajax({
				url: "closely.json",
				type: "POST",
				dataType: "json",
				data: {
						_csrf: window.csrf_token,
						id: id,
						absences: absentees,
						tags: attendees
				},
				success: function(json){
						// ソーティングアニメーションを消去
						$("#sorting-friends").hide();
						
						$.each(json, function(key, val){
								$friend = $("#friend-item-container [data-id="+key+"]");
								$friend.attr("data-closely", parseInt($friend.attr("data-closely"))+(operator*val));
						});
						sortFriends();
				}
		});
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
		$.ajax({
				url: "absence.json",
				type: "POST",
				dataType: "json",
				data: {
						_csrf: window.csrf_token,
						id: id
				},
				success: function(json){
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
				}
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
function getPhoto($item) {
		var $photoWrapper = $("#photo-wrapper");
		var $photoItemContainer = $("#photo-item-container");
		var id = $item.attr("data-id");

		$photoItemContainer.hide();
		$photoWrapper.show();
		$("#photo-inner").remove();

		// 写真リストを隠す
		$("#photo-select-wrapper").hide();
		
		// ナビメッセージを変更
		$("#navi-message").text("欠席者を追加して集合写真を作成");
		
		// ローディングアニメーション表示
		$("#loading-photo").show();
		
		$.ajax({
				url: "photo.json",
				type: "POST",
				dataType: "json",
				data: {
						_csrf: window.csrf_token,
						id: id
				},
				success: function(json){
						var $photo = $(new EJS({
								url: "ejs/photo.ejs"
						}).render({ source: json["source"], width: json["width"] }));
						
						// 欠席者を削除
						$(".absence-wrapper").each(function(){
								removeAbsentee($(this).attr("data-id"));
						});
						
						// 友達リストの並びを初期化
						initFriendsOrder();
						
						// ローディングアニメーション消去
						$("#loading-photo").hide();
						
						// 写真を追加
						$photoWrapper.prepend($photo);
						
						// 出席者を追加
						$item.find("[name='tags[]']").each(function(){
								addAttendee($(this).val());
						});
						
						// 作成ボタンを有効化
						$("#create-button").removeAttr("disabled");								
				}
		});
}

/**
 * 写真を作る
 */
function createPhoto(){
		var photo = $("#photo-container [name='photo']").val();
		var src = $("#photo-container [name='absence[src][]']").map(function(){ return $(this).val(); }).toArray();
		var x = $("#photo-container [name='absence[x][]']").map(function(){ return $(this).val(); }).toArray();
		var y = $("#photo-container [name='absence[y][]']").map(function(){ return $(this).val(); }).toArray();
		var absences = {src: src, x: x, y: y};
		
		$.ajax({
				url: "create.json",
				type: "POST",
				dataType: "json",
				data: {
						_csrf: window.csrf_token,
						photo: photo,
						absences: absences
				},
				async: false,
				success: function(json){
						showResult(json);
				}
		});
}

/**
 * 生成結果を表示する
 */
function showResult(json) {
		var $modalContainer = $("#modal-container");		
		var $result = $(new EJS({
				url: "ejs/result.ejs"
		}).render({ source: json['path'] }));
		
		$modalContainer.empty();
		$modalContainer.prepend($result);
		$result.modal("show");
}

function upload() {
		$.ajax({
				url: "upload",
				type: "POST",
				dataType: "html",
				data: {
						_csrf: window.csrf_token,
						url: $("#result-image").attr("src"),
						message: $("#message").val(),
						name: $("#photo-container [name='absence[src][]']").map(function(){ return $(this).val(); }).toArray(),
						x: $("#photo-container [name='absence[x][]']").map(function(){ return $(this).val(); }).toArray(),
						y: $("#photo-container [name='absence[y][]']").map(function(){ return $(this).val(); }).toArray()						
				},
				async: false,
				success: function(html){
						alert(html);
				}
		});
}