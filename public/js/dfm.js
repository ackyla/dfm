$(function(){

		$.ajaxSetup({
				error: function(XMLHttpRequest, textStatus, errorThrown){
						$("#communication-error-message").show().delay(5000).fadeOut('slow');
						// 戻るボタンを有効化
						$("#return-button").removeAttr("disabled");
				},
				cache: false
		});
		
		// isotopeを初期化
		initIsotope();

		// フレームを取得
		//getFrames();
		
		// アルバムを取得
		getAlbums("0");

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
 * #return-buttonを押した時に動く
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
		$("#load-next-photos-button").hide();
		if($("#albums-offset").val() != "0"){
				$("#load-next-albums-button").show();
		}
		$("#toggle-mode-button").hide();
		hideFrameContainer();
		return false;
}

/**
 * アルバムリストを取得する
 */
function getAlbums(offset) {
		var $albumContainer = $("#album-item-container");

		// ローディングアニメーション表示
		$("#loading-albums").show();

		// アルバムリストを取得
		$.ajax({
				url: "albums.json",
				type: "POST",
				dataType: "json",
				data: {
						offset: offset
				},
				success: function(json){
						var $albums = $(new EJS({
								url: "ejs/isotope_item.ejs"
						}).render({ items: json["albums"] }));						

						// 読み込みボタンを表示
						if(json["offset"]){
								$("#albums-offset").val(json["offset"]);
								$("#load-next-albums-button").show();
						}else{
								// 次がない時は非表示
								$("#albums-offset").val("0");
								$("#load-next-albums-button").hide();
						}
						
						// ローディングアニメーション消去
						$("#loading-albums").hide();
						
						// isotopeにアルバムリストを挿入
						$albumContainer.isotope("insert", $albums);

						// クリックされた時の動作を設定
						$albums.click(function(){
								var $photoContainer = $("#photo-item-container");
								
								// ナビメッセージを変更
								$("#navi-message").text("写真を選択");
								
								// 読み込みボタンを非表示
								$("#load-next-albums-button").hide();

								// 写真読み込みボタンのアルバムIDを変更
								$("#load-next-photos-button").attr("onClick", "getNextPhotos("+$(this).attr("data-id")+")");

								$("#album-item-container").hide();
								$photoContainer.show();
								
								if($(this).hasClass("clicked")){
										// 1回クリックされたアルバムは写真リストを取得しない
										showPhotos($(this).attr("data-id"));
										// 戻るボタンを有効化
										$("#return-button").removeAttr("disabled");
								}else{
										// 写真を非表示
										$photoContainer.isotope({ filter: ":not(.item)" });
										// アルバムIDを使用して写真リストを取得する
										$(this).addClass("clicked");
										getPhotos($(this).attr("data-id"), 0);
								}
								return false;
						});
				}
		});
}

function getNextAlbums() {
		$("#load-next-albums-button").hide();
		getAlbums($("#albums-offset").val());
		return false;
}

/**
 * 写真を表示する
 */
function showPhotos(id) {
		// 読み込みボタンを表示する
		if($("[album-id="+id+"].photos-offset").length){
				if($("[album-id="+id+"].photos-offset").val() != "0"){
						$("#load-next-photos-button").show();
				}
		}

		// album-idでフィルタリングする
		$("#photo-item-container").isotope({ filter: ".album-"+id });
}

/**
 * 写真を取得する
 */
function getPhotos(id, offset) {
		var $photoContainer = $("#photo-item-container");

		// ローディングアニメーション表示
		$("#loading-photos").show();
		
		if(id == "0"){
				$.ajax({
						url: "tagged_photos.json",
						type: "POST",
						dataType: "json",
						data: {
								offset: offset
						},
						success: function(json){
								var $photo = $(new EJS({
										url: "ejs/isotope_item.ejs"
								}).render({ items: json["photos"] }));
								$photo.each(function(){
										$(this).addClass("album-"+id);
								});

								// 読み込みボタンを表示
								if(json["offset"]){
										if($("[album-id='"+id+"'].photos-offset").length){
												$("[album-id='"+id+"'].photos-offset").val(json["offset"]);
										}else{
												$("#load-next-button-wrapper").append($("<input>", { type: "hidden" }).addClass("photos-offset").attr("album-id", id).val(json["offset"]));
										}
										$("#load-next-photos-button").show();
								}else{
										// 次がない時は非表示
										$("#load-next-photos-button").hide();
										$("[album-id='"+id+"'].photos-offset").val(0);
								}
								
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
								id: id,
								offset: offset
						},
						success: function(json){
								var $photo = $(new EJS({
										url: "ejs/isotope_item.ejs"
								}).render({ items: json["photos"] }));
								$photo.each(function(){
										$(this).addClass("album-"+id);
								});

								// 読み込みボタンを表示
								if(json["offset"]){
										if($("[album-id='"+id+"'].photos-offset").length){
												$("[album-id='"+id+"'].photos-offset").val(json["offset"]);
										}else{
												$("#load-next-button-wrapper").append($("<input>", { type: "hidden" }).addClass("photos-offset").attr("album-id", id).val(json["offset"]));
										}
										$("#load-next-photos-button").show();
								}else{
										// 次がない時は非表示
										$("#load-next-photos-button").hide();
										$("[album-id='"+id+"'].photos-offset").val(0);
								}
								
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

function getNextPhotos(id) {
		$("#load-next-photos-button").hide();
		getPhotos(id, $("[album-id="+id+"].photos-offset").val());
		return false;
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
function addAttendee(id, x, y) {
		var src = $("#friend-item-container [data-id="+id+"]").find(".profile-picture").attr("src");
		var $photo = $("#photo-inner")
		var $attendee = $(new EJS({
				url: "ejs/attendee.ejs"
		}).render({ id: id, src: src, x: x, y: y }));
		//var $attendee = $("<input>", { type: "hidden", name: "tags[]" }).attr("pos-x", tag["x"]).attr("pos-y", tag["y"]).addClass("attendee-tag").val(id);
		var absentees = $(".absence-wrapper").map(function(){ return $(this).attr("data-id"); }).toArray();
		var attendees = $(".attendee-wrapper").map(function(){ return $(this).attr("data-id"); }).toArray();

		// 選択された友達はリストから非表示にする
		hideFriend(id);
		
		// ajax
		updateClosely(id, absentees, attendees, -1);

		$("#attendee-container").append($attendee);

		// ドラッガブル
		$attendee.draggable({
				grid: [5, 5],
				containment: "#photo-inner"
		});
		
		// 閉じる
		$attendee.find(".close-button").click(function(){
				showFriend(id);
				removeAttendee(id);
				return false;
		});
}

/**
 * 欠席者を追加する
 */
function addAbsentee(id) {
		
		// 既に追加されている欠席者と出席者を取得
		var absentees = $(".absence-wrapper").map(function(){ return $(this).attr("data-id"); }).toArray();
		var attendees = $("#photo-inner").find("[name='tags[]']").map(function(){ return $(this).val(); }).toArray();
		
		// 欠席者を追加
		var $absentee = $(new EJS({
				url: "ejs/absence.ejs"
		}).render({ id: id }));
		$("#absence-container").append($absentee);

		// 選択された友達はリストから非表示にする
		hideFriend(id);
		
		// 友達リストをソート
		updateClosely(id, absentees, attendees, -1);

		// フレームリストを隠す
		hideFrameContainer();
		
		// 欠席者の写真を取得
		$.ajax({
				url: "absentee.json",
				type: "POST",
				dataType: "json",
				data: {
						id: id,
						shape: "oval",
						border: "white",
						color: "color"
				},
				success: function(json){

						// 追加していたフレームに写真を表示する
						$absentee.find(".absence-image").attr("src", json["source"]).show();
						$absentee.find(".loading-absence-image").hide();
						
						// ドラッガブル
						$absentee.draggable({
								drag: function(){
										$(this).find("input.position-x").val($(this).css("left"));
										$(this).find("input.position-y").val($(this).css("top"));
								},
								containment: "#photo-inner",
								grid: [5, 5]
						});
						
						// セレクト(仮)
						$absentee.find(".absence-image-wrapper").click(function(){
								$(this).toggleClass('selected');
						});
						
						// 閉じる
						$absentee.find(".close-button").show().click(function(){
								// フレームリストを隠す
								hideFrameContainer();
								showFriend(id);
								removeAbsentee($(this).closest(".absence-wrapper").attr("data-id"));
								return false;
						});

						// フレーム変更（仮）
						$absentee.click(function(){
								$("img.selected").removeClass("selected");
								$(this).find(".absence-image").addClass("selected");
								$("#selected-absentee-id").val($absentee.attr("data-id"));
								$("#frame-container").show(1, function(){
										$(".photo").click(function(){
												hideFrameContainer();
										});
								});
								return false;
						});
				}
		});
}

function hideFrameContainer() {
		$("img.selected").removeClass("selected");
		$("#frame-container").hide();
		$(".photo").unbind("click");
}

/**
 * フレームを変える
 */
function changeFrame(shape, border, color, size) {

		id = $("#selected-absentee-id").val();
		$absentee = $("[data-id="+id+"].absence-wrapper");
		
		// 写真を非表示にしてロードを表示する
		$absentee.find(".absence-image").hide();
		$absentee.find(".loading-absence-image").show();
		$absentee.find(".close-button").hide();

		// nullだったら情報を取ってくる
		if(shape == null){
				shape = $absentee.attr("data-shape");
		}
		if(border == null){
				border = $absentee.attr("data-border");
		}
		if(color == null){
				color = $absentee.attr("data-color");
		}
		if(size == null){
				size = $absentee.attr("data-size");
		}

		// 現在の設定を保存する
		$absentee.attr("data-shape", shape);
		$absentee.attr("data-border", border);
		$absentee.attr("data-color", color);
		$absentee.attr("data-size", size);
		
		// 欠席者の写真を取得
		$.ajax({
				url: "absentee.json",
				type: "POST",
				dataType: "json",
				data: {
						id: $absentee.attr("data-id"),
						shape: shape,
						border: border,
						color: color,
						size: size
				},
				success: function(json){

						// フレーム変更
						$absentee.find(".absence-image").attr("src", json["source"]).show();
						$absentee.find(".loading-absence-image").hide();
						$absentee.find(".close-button").show();
						
				}
		});
}

/**
 * 出席者を削除する
 */
function removeAttendee(id) {

		$("[data-id="+id+"].attendee-wrapper").remove();

		var absentees = $(".absence-wrapper").map(function(){ return $(this).attr("data-id"); }).toArray();
		var attendees = $(".attendee-wrapper").map(function(){ return $(this).attr("data-id"); }).toArray();

		// ajax
		updateClosely(id, absentees, attendees, 1);
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
						id: id
				},
				success: function(json){
						var $photo = $(new EJS({
								url: "ejs/photo.ejs"
						}).render({ photo: json }));
						
						// 欠席者を削除
						$(".absence-wrapper").each(function(){
								removeAbsentee($(this).attr("data-id"));
						});
						
						// 友達リストの並びを初期化
						initFriendsOrder();
						
						// ローディングアニメーション消去
						$("#loading-photo").hide();
						
						// 写真を追加
						$photoWrapper.append($photo);
						
						// 出席者を追加
						$.each(json["tags"], function(){
								if(this.id != undefined, this.x != undefined, this.y != undefined){
										var x = $photo.attr("data-width")*(this.x/100)-23;
										var y = $photo.attr("data-height")*(this.y/100)-55;
										addAttendee(this.id, x, y);
								}
						});

						// 戻るボタンを有効化
						$("#return-button").removeAttr("disabled");
						
						// 作成ボタンを有効化
						$("#create-button").removeAttr("disabled");

						// 欠席者モードをon
						enableAbsenteeMode();
						
						// モード切り替えボタンを表示
						$("#toggle-mode-button").show();
				}
		});
}

/**
 * 写真を作る
 */
function createPhoto(){
		var photo = $("#photo-container [name='photo']").val();
		var src = $("#photo-container .absence-image").map(function(){ return $(this).attr("src"); }).toArray();
		var x = $("#photo-container .position-x").map(function(){ return $(this).val(); }).toArray();
		var y = $("#photo-container .position-y").map(function(){ return $(this).val(); }).toArray();
		var absences = {src: src, x: x, y: y};

		if(src.length > 0){
				$.ajax({
						url: "create.json",
						type: "POST",
						dataType: "json",
						data: {
								photo: photo,
								absences: absences
						},
						async: false,
						success: function(json){
								showResult(json);
						}
				});
		}else{
				$("#create-error-message").show().delay(2000).fadeOut('slow');
		}
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

function upload(isRepeated) {
		var width = $("#photo-inner").attr("data-width");
		var height = $("#photo-inner").attr("data-height");
		
		$.ajax({
				url: "upload",
				type: "POST",
				dataType: "json",
				data: {
						url: $("#result-image").attr("src"),
						message: $("#message").val(),
						use_tag: $("#use-tag").attr("checked") ? "tag" : "",
						id: $(".absence-wrapper").map(function(){ return $(this).attr("data-id"); }).toArray(),
						x: $(".position-x").map(function(){ return (parseInt($(this).val())+parseInt($(this).closest(".absence-wrapper").find(".absence-image").width())/2)/width*100; }).toArray(),
						y: $(".position-y").map(function(){ return (parseInt($(this).val())+parseInt($(this).closest(".absence-wrapper").find(".absence-image").height())/2)/height*100; }).toArray(),
						attendee_id: $(".attendee-wrapper").map(function(){ return $(this).attr("data-id"); }).toArray(),
						attendee_x: $(".attendee-wrapper").map(function(){ return (parseInt($(this).css("left"))+23)/width*100; }).toArray(),
						attendee_y: $(".attendee-wrapper").map(function(){ return (parseInt($(this).css("top"))+55)/height*100; }).toArray(),
						is_repeated: isRepeated
				},
				success: function(json){
						if(json == "success"){
								location.replace("finished");
						}else if(json == "not_permitted"){
								FB.ui({
										method: 'permissions.request',
										perms: 'photo_upload',
										display: 'iframe'
								},function(response){
										upload(true);
								});
						}else{
								$("#permission-error-message").show().delay(5000).fadeOut('slow');
								$(".modal-backdrop").fadeOut(function(){ $(this).remove(); });
								$(".modal").fadeOut(function(){ $(this).remove(); });
						}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown){
						$("#communication-error-message").show().delay(5000).fadeOut('slow');
						$(".modal-backdrop").fadeOut(function(){ $(this).remove(); });
						$(".modal").fadeOut(function(){ $(this).remove(); });
				},
				beforeSend: function(){
						$(".modal-backdrop").unbind();
						$(".modal-footer").empty();
						$(".modal-footer").append($("<strong>").text("投稿しています、しばらくお待ち下さい…"));
				}
		});
}

/**
 * 写真をアップロードして編集画面に表示する
 */
function uploadPhoto() {
		var $photoWrapper = $("#photo-wrapper");
		var $photoItemContainer = $("#photo-item-container");		
		var file = $("#file")[0];
		var fr = new FileReader();

		if(!$("#file").val().length){
				return false;
		}
		
		$photoItemContainer.hide();
		$photoWrapper.show();
		$("#photo-inner").remove();
		
		// 写真リストを隠す
		$("#photo-select-wrapper").hide();
		
		// ナビメッセージを変更
		$("#navi-message").text("欠席者を追加して集合写真を作成");
		
		// ローディングアニメーション表示
		$("#loading-photo").show();
		
		fr.onload = function(){
				$("#file").val("");

				$.ajax({
						url: "upload.json",
						type: "POST", 
						data: {
								file: fr.result
						},
						success: function(json){
								var $photo = $(new EJS({
										url: "ejs/photo.ejs"
								}).render({ photo: json }));
								
								// 欠席者を削除
								$(".absence-wrapper").each(function(){
										removeAbsentee($(this).attr("data-id"));
								});
								
								// 友達リストの並びを初期化
								initFriendsOrder();
								
								// ローディングアニメーション消去
								$("#loading-photo").hide();
								
								// 写真を追加
								$photoWrapper.append($photo);

								// 戻るボタンを有効化
								$("#return-button").removeAttr("disabled");
								
								// 作成ボタンを有効化
								$("#create-button").removeAttr("disabled");

								// 出席者モードをon
								enableAttendeeMode();
								
								// モード切り替えボタンを表示
								$("#toggle-mode-button").show();
						}
				});
		}

		fr.onloadstart = function(){
				// サイズ制限を超えたらエラーを表示
				if(file.files[0].size > 1024*1024*10){
						$("#size-error-message").show().delay(5000).fadeOut('slow');
						fr.abort();
				}
				// ファイルタイプが指定のもの以外だったらエラーを表示
				type = file.files[0].type
				if(type.indexOf("jpeg") == -1 && type.indexOf("png") == -1 && type.indexOf("gif") == -1){
						$("#filetype-error-message").show().delay(5000).fadeOut('slow');
						fr.abort();
				}
		}

		fr.onabort = function(){
				// 戻るボタンを有効化
				$("#return-button").removeAttr("disabled");
				// ローディングアニメーション消去
				$("#loading-photo").hide();
		}

		fr.readAsDataURL(file.files[0]);
}

function enableAttendeeMode() {
		$("#attendee-mode-button").addClass("active");
		$("#absentee-mode-button").removeClass("active");
		$("#attendee-container").show();
		$("#absence-container").hide();

		// ナビメッセージを変更
		$("#navi-message").text("出席者にタグを付ける");
		
		$(".friend-wrapper").unbind("click").click(function(){
				var id = $(this).attr("data-id");
				addAttendee(id, 20, 20);
				return false;
		});
}

function enableAbsenteeMode() {
		$("#attendee-mode-button").removeClass("active");
		$("#absentee-mode-button").addClass("active");
		$("#attendee-container").hide();
		$("#absence-container").show();

		// ナビメッセージを変更
		$("#navi-message").text("欠席者を追加して集合写真を作成");
		
		$(".friend-wrapper").unbind("click").click(function(){
				var id = $(this).attr("data-id");
				addAbsentee(id);
				return false;
		});
}