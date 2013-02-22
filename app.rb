# -*- coding: utf-8 -*-
require 'sinatra/base'
require 'rack/protection'
require 'fb_graph'
require 'json'
require 'RMagick'
require 'imlib2'
require 'base64'
require 'securerandom'


class DfmApp < Sinatra::Base

  configure do
    APP_KEY, APP_SECRET = File.open(".key").read.split
    MAX_WIDTH = 720;
    use Rack::Session::Cookie,
    :key => 'dfm.session',
    #:domain => 't-forget.me',
    #:path => '/',
    :expire_after => 3600,
    :secret => File.open(".secret").read.split.to_s
    use Rack::Protection
  end

  helpers do
    def app_key
      APP_KEY
    end

    def site_url
      "#{request.scheme}://#{request.host}" + (request.port != 80 ? ":#{request.port}" : "")
    end

    def get_timestamp(path)
      FileTest.exist?(path) ? "?#{File.mtime(path).to_i}" : ""
    end
  end

  error do
    "sorry"
  end

  not_found do
    "404"
  end

  get '/' do
    @page_name = ""
    erb :index
  end

  get '/edit' do

    # セッションがなかったらauthに飛ぶ
    if session[:token].nil?
      redirect '/auth'
    end

    # apiでユーザの取得に失敗したらauthに飛ぶ
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}" + (request.port != 80 ? ":#{request.port}" : "") + "/auth/callback"
    begin
      me = FbGraph::User.me session[:token] 
      me.fetch
    rescue
      redirect '/auth'
    end
    
    # 権限が足りてなかったらauthに飛ぶ
    if(!me.permissions.include?(:user_photos) || !me.permissions.include?(:friends_photos))
      redirect '/auth'
    end

    # モバイルだと投稿時の権限追加がうまくできないので、photo_uploadがあるかもチェックする
    ua = request.user_agent
    if ua.include?('Mobile') || ua.include?('Android')
      if !me.permissions.include?(:photo_upload)
        redirect '/auth'
      end
    end
    
    @is_ie = ua.include?('MSIE') ? true : false
    @page_name = "写真作成 | "
    @page_js = "<script type='text/javascript' src='js/dfm.js#{get_timestamp("./public/js/index.js")}' charset='utf-8'></script>"
    erb :edit
  end
  
  get '/finished' do
    @page_name = "投稿完了 | "
    erb :finished
  end

  #facebook認証
  get '/auth' do
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}" + (request.port != 80 ? ":#{request.port}" : "") + "/auth/callback"
    # モバイルだと投稿時の権限追加がうまくできないので、photo_uploadも認証に追加する
    ua = request.user_agent
    if ua.include?('Mobile') || ua.include?('Android')
      redirect auth.client.authorization_uri(:scope => [:user_photos, :friends_photos, :photo_upload])
    else
      redirect auth.client.authorization_uri(:scope => [:user_photos, :friends_photos])
    end
  end

  #facebook認証のコールバック
  get '/auth/callback' do

    #facebookからのcodeが無かったらトップに戻る
    if params[:code].nil?
      redirect '/'
    end

    #codeをセット
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}" + (request.port != 80 ? ":#{request.port}" : "") + "/auth/callback"
    client = auth.client
    client.authorization_code = params[:code]
    
    #アクセストークンを取得
    begin
      access_token = client.access_token! :client_auth_body
      session[:token] = access_token.access_token
      #画像生成用のディレクトリを生成
      session_id = session[:session_id]
      path = "./public/files/#{session_id}"
      FileUtils.mkdir_p(path) unless FileTest.exist?(path)
    rescue
      redirect '/'
    end

    redirect '/edit'
  end

  # 友達リストを取得
  # Return:: json
  post '/friends.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    friends = user.friends({"locale" => "ja_JP", :fields => "id, name, picture.width(34).height(34)"})
    friends = friends.to_a.map{|friend|
      {
        "id" => friend.identifier,
        "name" => friend.name, 
        "picture" => friend.picture
      }
    }
    friends.unshift({"id" => user.identifier, "name" => user.name, "picture" => user.picture({"&width=" => "34", "&height=" => "34"})})
    content_type "application/json; charset=utf-8"
    friends.to_json
  end

  # アルバムリストを取得
  # Param:: params[:offset](オフセット)
  # Return:: json
  post '/albums.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    albums = user.albums({"locale" => "ja_JP", "offset" => params[:offset], :fields => "id, name, cover_photo"})
    offset = albums.next.empty? ? nil : (params[:offset].to_i + albums.count)
    albums = albums.to_a.map{|album|
      {
        "id" => album.identifier,
        "name" => album.name,
        "source" => album.cover_photo.nil? ? nil : album.cover_photo.fetch({:access_token => session[:token], :fields => "source"}).source,
      }
    }

    if(params[:offset].to_i == 0)
      photos = user.photos({"type" => "tagged", "limit" => 1, :fields => "source"})
      # 自分が写っている写真が1枚以上あった時はアルバムとして表示する
      if(photos.count > 0)
        albums.unshift({"id" => 0, "name" => "あなたが写っている写真", "source" => photos[0].source, "tags" => Array::new})
      end
    end


    response = {
      "albums" => albums,
      "offset" => offset,
    }
    content_type "application/json; charset=utf-8"
    response.to_json
  end

  # 自分のタグが付いた写真を取得
  # Param:: params[:offset](オフセット)
  # Return:: json
  post '/tagged_photos.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    photos = user.photos({"type" => "tagged", "offset" => params[:offset], :fields => "id, name, source"})
    offset = photos.next.empty? ? nil : (params[:offset].to_i + photos.count)
    photos = photos.to_a.map{|photo|
      {
        "id" => photo.identifier,
        "name" => photo.name.nil? ? "無題" : photo.name,
        "source" => photo.source,
      }
    }

    response = {
      "photos" => photos,
      "offset" => offset,
    }
    content_type "application/json; charset=utf-8"
    response.to_json
  end

  # アルバムの写真を取得
  # Param:: params[:id](アルバムID), params[:offset](オフセット)
  # Return:: json
  post '/photos.json' do
    id = params[:id]
    album = FbGraph::Album.new(id, :access_token => session[:token]).fetch
    photos = album.photos({"offset" => params[:offset], :fields => "id, name, source"})
    offset = photos.next.empty? ? nil : (params[:offset].to_i + photos.count)
    photos = photos.to_a.map{|photo|
      {
        "id" => photo.identifier,
        "name" => photo.name.nil? ? "無題" : photo.name,
        "source" => photo.source,
      }
    }

    response = {
      "photos" => photos,
      "offset" => offset,
    }
    content_type "application/json; charset=utf-8"
    response.to_json
  end

  # 欠席者の写真を取得
  # Param:: params[:id](欠席者のFacebookID)
  # Return:: json
  post '/absentee.json' do
    
    case params[:size]
    when "small"
      width = 50
      height = 50
      photo_x = 4
      photo_y = 2
    when "big"
      width = 200
      height = 200
      photo_x = 16
      photo_y = 12
    else
      # normal
      width = 100
      height = 100
      photo_x = 8
      photo_y = 5
    end

    case params[:border]
    when "black"
      stroke_width = 2
      stroke_color = "black"
    when "none"
      stroke_width = 0
      stroke_color = "none"
    else
      # white
      stroke_width = 2
      stroke_color = "white"
    end

    case params[:shape]
    when "circle"
      corner_width = width/2
      corner_height = height/2
    when "square"
      corner_width = width/10
      corner_height = height/10
    when "photographer"
      corner_width = 0
      corner_height = 0
      stroke_width = 0
    else
      # oval
      height = height*1.2
      corner_width = width/2
      corner_height = height/2
    end
    
    case params[:color]
    when "gray"
      gray_scale = true
    else
      # color
      gray_scale = false
    end

    # 枠がある時はマスクを枠の分だけ小さくする
    if stroke_width > 0
      width -= stroke_width*2
      height -= stroke_width*2
    end

    id = params[:id]
    user = FbGraph::User.new(id, :access_token => session[:token]).fetch({"fields" => "picture.width(#{width}).height(#{height})"})
    fb_url = user.raw_attributes["picture"]["data"]["url"]
    session_id = session[:session_id]
    filename = SecureRandom.hex(16)
    url = "/files/#{session_id}/#{filename}.png"
    dir = "./public#{url}"

    begin
      absentee = Magick::ImageList.new(fb_url)

      # Facebookから取得した画像が設定したサイズと違っていたらリサイズ
      if(absentee.columns != width || absentee.rows != height)
        absentee = absentee.resize(width, height)
      end

      # gray_scaleがtrueの時は白黒にする
      if(gray_scale)
        absentee = absentee.modulate(1.0, 0.0001, 1.0)
      end
      
      # 角丸の指定あったらマスキングする
      if corner_width > 0 || corner_height > 0
        dr = Magick::Draw.new
        dr.fill = "black"
        dr.roundrectangle(0, 0, width-1, height-1, corner_width, corner_height)
        mask = Magick::ImageList.new
        mask.new_image(width, height) { self.background_color = "none" }
        dr.draw(mask)
        absentee = mask.composite(absentee, 0, 0, Magick::SrcInCompositeOp)
      end

      # 枠の指定があったら枠を付ける
      if stroke_width > 0
        dr = Magick::Draw.new
        dr.fill = stroke_color
        dr.roundrectangle(0, 0, width-1+stroke_width*2, height-1+stroke_width*2, corner_width+stroke_width, corner_height+stroke_width)
        border = Magick::ImageList.new
        border.new_image(width+stroke_width*2, height+stroke_width*2) { self.background_color = "none" }
        dr.draw(border)
        absentee = border.composite(absentee, stroke_width, stroke_width, Magick::OverCompositeOp)
      end

      absentee.write(dir)

      # shapeがphotographerだったら写真風にする
      if params[:shape] == "photographer"
        absentee = Imlib2::Image.load(dir)
        basis = Imlib2::Image.load("./files/photograph_#{params[:size]}.png")
        absentee = basis.blend(absentee, 0, 0, absentee.w, absentee.h, photo_x, photo_y, absentee.w, absentee.h, false)
        absentee.attach_value("quality", 95)
        absentee.save(dir)
      end
      
      picture = {"source" => url}
      content_type "application/json; charset=utf-8"
      picture.to_json
    rescue => exc
      content_type "application/json; charset=utf-8"
      exc.to_json
    end
  end

  # 写真を取得
  # Param:: params[:id](写真ID)
  # Return:: json
  post '/photo.json' do
    id = params[:id]
    photo = FbGraph::Photo.new(id, :access_token => session[:token]).fetch({:fields => "source, tags"})
    session_id = session[:session_id]

    fb_url = photo.source
    filename = SecureRandom.hex(16)
    url = "/files/#{session_id}/#{filename}.jpg"
    dir = "./public#{url}"
    img = Magick::ImageList.new(fb_url)

    #横幅がMAX_WIDTHより大きかったら比率維持して縮小
    if(img.columns > MAX_WIDTH)
      img = img.resize_to_fit(MAX_WIDTH, 0)
    end

    img.write(dir)

    res = {
      "source" => url,
      "width" => img.columns,
      "height" => img.rows,
      "tags" => photo.tags.to_a.map{|tag|
        {
          "id" => tag.user.identifier,
          "x" => tag.x,
          "y" => tag.y
        } if tag.user != nil
      }
    }

    content_type "application/json; charset=utf-8"
    res.to_json
  end

  # 既に追加されている出席・欠席者に対してそれぞれ共通の友達を取得し合計を計算する
  # Param:: params[:absences](既に追加されている欠席者のFacebookID), params[:tags](出席者のFacebookID), params[:id](追加する欠席者のFacebookID)
  # Return:: json
  post '/closely.json' do
    #既に追加されている欠席者
    absences = params[:absences].nil? ? Array::new : params[:absences]
    #タグ付けされたユーザのID
    tags = params[:tags].nil? ? Array::new : params[:tags]
    #追加する欠席者のID
    id = params[:id]

    #ユーザを取得
    me = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})

    closely = Hash::new

    mutuals = me.mutual_friends(id).to_a.map{|friend|
      friend.identifier
    }
    
    absences.each{|absence|
      friends = me.mutual_friends(absence)
      friends.each{|friend|
        if(mutuals.include?(friend.identifier))
          if closely["#{friend.identifier}"].nil?
            closely["#{friend.identifier}"] = 1
          else
            closely["#{friend.identifier}"] += 1
          end
        end
      }
    }

    tags.each{|tag|
      friends = me.mutual_friends(tag)
      friends.each{|friend|
        if(mutuals.include?(friend.identifier))
          if closely["#{friend.identifier}"].nil?
            closely["#{friend.identifier}"] = 1
          else
            closely["#{friend.identifier}"] += 1
          end
        end
      }
    }

    content_type "application/json; charset=utf-8"
    closely.to_json
  end

  # 欠席者を合成した写真を作成
  # Param:: params[:absences](欠席者の写真urlと座標), params[:photo](ベースの写真url)
  # Return:: json
  post '/create.json' do
    
    absences = params[:absences].nil? ? Hash::new : params[:absences]
    session_id = session[:session_id]
    filename = SecureRandom.hex(16)
    url = "/files/#{session_id}/photo_#{filename}.jpg"
    dir = "./public#{url}"

    # ディレクトリが無かったら作る
    FileUtils.mkdir_p("./public/files/#{session_id}") unless FileTest.exist?("./public/files/#{session_id}")

    if(false)
      photo = Magick::ImageList.new("./public#{params[:photo]}")

      for i in 0..(absences["x"].nil? ? -1 : absences["x"].size-1)
        absence = Magick::ImageList.new("./public#{absences["src"][i]}")
        photo = photo.composite(absence, absences["x"][i].to_i, absences["y"][i].to_i, Magick::OverCompositeOp)
      end

      photo.write(dir){
        self.quality = 95
      }
    else
      photo = Imlib2::Image.load("./public#{params[:photo]}")

      for i in 0..(absences["x"].nil? ? -1 : absences["x"].size-1)
        absentee = Imlib2::Image.load("./public#{absences["src"][i]}")
        photo = photo.blend(absentee, 0, 0, absentee.width, absentee.height, absences["x"][i].to_i, absences["y"][i].to_i, absentee.width, absentee.height, false)
      end

      photo.attach_value("quality", 95)
      photo.save(dir)
    end

    json = {
      "path" => url,
    }

    content_type "application/json; charset=utf-8"
    json.to_json
  end

  # 作成した写真をFacebookに投稿する
  # Param:: params[:url](合成写真のurl), params[:name](タグ名), params[:x](タグのx座標), params[:y](タグのy座標), params[:message](コメント)
  post '/upload' do

    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    flag = user.permissions.include?(:photo_upload)
    if(!flag && params[:is_repeated])
      result = "permission_refused"
    elsif(!flag)
      result = "not_permitted"
    else
      dir = "./public#{params[:url]}"
      photo = Magick::ImageList.new(dir)
      tags = Array::new
      
      if(params[:use_tag] == "tag")
        if(!params[:id].nil? && !params[:x].nil? && !params[:y].nil?)
          for i in 0..(params[:id].size-1)
            tags.append(FbGraph::Tag.new(:name => "#{params[:id][i]}", :x => params[:x][i], :y => params[:y][i]))
          end
        end
        if(!params[:attendee_id].nil? && !params[:attendee_x].nil? && !params[:attendee_y].nil?)
          for i in 0..(params[:attendee_id].size-1)
            tags.append(FbGraph::Tag.new(:name => "#{params[:attendee_id][i]}", :x => params[:attendee_x][i], :y => params[:attendee_y][i]))
          end
        end
      end
      
      message = "#{params[:message]}\n--------------------------------\n休んだ人も写真に入れてあげましょう。\nDon't forget me!!!\n・http://don.t-forget.me\n--------------------------------"
      
      user.photo!(:source => File.new(dir), :message => message, :tags => tags)
      
      # ファイルを削除
      #File.delete(session[:path]) if File.exist?(session[:path])

      result = "success"
    end

    content_type "application/json; charset=utf-8"
    result.to_json
  end

  # POSTされたバイナリ形式の写真をリサイズして保存する
  # Param:: params[:file](アップロードファイルのバイナリデータ)
  post '/upload.json' do
    mime = params[:file].split(",")[0]
    if(!mime.include?("image/jpeg") && !mime.include?("image/png") && !mime.include?("image/gif"))
      halt 500
    end

    session_id = session[:session_id]
    filename = SecureRandom.hex(16)
    url = "/files/#{session_id}/#{filename}.jpg"
    dir = "./public#{url}"
    img = Magick::Image.from_blob(Base64.decode64(params[:file].split(",")[1])).shift
    width = img.columns
    height = img.rows
    img.write(dir)

    #横幅がMAX_WIDTHより大きかったら比率維持して縮小
    if(width > MAX_WIDTH)
      img = Imlib2::Image.load(dir)
      img.crop_scaled!(0, 0, width, height, MAX_WIDTH, height*(MAX_WIDTH.to_f/width))
      img['quality'] = 90
      img.save(dir)
      width = img.w
      height = img.h
    end

    res = {
      "source" => url,
      "width" => width,
      "height" => height,
      "tags" => nil
    }

    content_type "application/json; charset=utf-8"
    res.to_json

  end
end
